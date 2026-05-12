#!/usr/bin/env node
/**
 * hammer-bridge.cjs v3 — 夯 核心编排助手（通用 IDE 串行适配版）
 *
 * 实现 Phase 2 (Swarm+Pipeline) 的 Agent 状态追踪、重试队列、失活检测、
 * Token 聚合、A2A 通知桥、Fix Protocol 记录等所有 Pipeline 编排功能。
 *
 * 【通用 IDE 适配说明】
 * 原 Claude Code 版通过 Agent() spawn 真并发，本版适配串行模式：
 * - agent-spawn 记录"阶段启动"（非真进程 spawn）
 * - 红/蓝/绿三队串行执行，每队 Stage 0→5 顺序推进
 * - 状态机仍完整记录，支持中断恢复和进度看板
 * - Token 聚合改为按实际串行请求累加
 *
 * 用法:
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs <command> [options]
 *
 * 命令:
 *   init         初始化新夯会话     --task <name> --total-agents <N> [--mode watch|oneshot]
 *   agent-spawn  记录 Agent 创建    --team <红/蓝/绿> --agent <名> --task-id <阶段> [--session-id <ID>]
 *   agent-done   标记 Agent 完成    --team <队> --agent <名> --output <产物路径> [--tokens-in N --tokens-out N]
 *   agent-fail   标记 Agent 失败    --team <队> --agent <名> --error "<原因>" [--max-attempts 3] [--max-backoff 300000]
 *   status       查看聚合状态
 *   summary      生成最终摘要       --task "<任务名>"
 *   stall-detect 失活检测           --stall-ms <毫秒>
 *   retry        列出/触发重试      [--team <队> --agent <名>]
 *   a2a-notify   Agent 通知         --type status --team <队> --agent <名> --status <done|blocked|failed> --message "<摘要>" [--artifact <路径>]
 *   a2a-task     Agent 提交任务     --description "<描述>" --from-agent "<名>" [--priority N]
 *   fix-record   记录修复协议       --type <类型> --severity <P0|P1> --source "<来源>" --task "<任务>" --error "<错误>" --root-cause "<根因>" --fix "<修复>" [--prevent "<预防>"]
 *   fix-search   搜索修复协议       --type <类型> [--limit N]
 *   prefix       输出共享前缀
 *   skill-routing 输出阶段技能路由表 --stage <N> --role "<角色>"
 *   token-track  Token 追踪         --add <session-id> [--tokens-in N --tokens-out N]
 *   api-state    输出 Monitor API 兼容状态
 *   watch        Watch 模式         --interval <毫秒>
 *
 * API:
 *   const bridge = require('./hammer-bridge.cjs');
 *   bridge.init({ task, totalAgents, mode }) → status
 *   bridge.agentSpawn({ team, agent, taskId, sessionId }) → status
 *   bridge.agentDone({ team, agent, output, tokensIn, tokensOut }) → status
 *   bridge.agentFail({ team, agent, error, maxAttempts, maxBackoff }) → status
 *   bridge.getStatus() → state
 *   bridge.getSummary({ task }) → summary
 *   bridge.stallDetect({ stallMs }) → stalled[]
 *   bridge.getRetries({ team, agent }) → retries
 *   bridge.a2aNotify({ type, team, agent, status, message, artifact }) → ok
 *   bridge.a2aTask({ description, fromAgent, priority }) → ok
 *   bridge.fixRecord({ type, severity, source, task, error, rootCause, fix, prevent }) → path
 *   bridge.fixSearch({ type, limit }) → records
 *   bridge.getPrefix() → string
 *   bridge.getSkillRoutingTable({ stage, agentRole }) → { ok, table }
 *   bridge.tokenTrack({ sessionId, tokensIn, tokensOut, operation }) → stats
 *   bridge.apiState() → state
 *   bridge.watch({ interval }) → ok
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.claude-flow', 'hammer-state');
const ARTIFACTS_DIR = path.join(ROOT, '.claude-flow', 'hammer-artifacts');
const QUEUE_DIR = path.join(ROOT, '.claude-flow', 'hammer-queue');
const LOG_DIR = path.join(ROOT, '.claude', 'logs');
const FIX_PROTOCOL_DIR = path.join(ROOT, '.claude', 'fix-protocol');
const A2A_DIR = path.join(STATE_DIR, 'a2a-notifications');

const STATUS_FILE = path.join(STATE_DIR, '.hammer-status.json');
const RETRY_FILE = path.join(STATE_DIR, '.hammer-retry.json');
const READY_FILE = path.join(STATE_DIR, '.hammer-ready.json');
const LOG_FILE = path.join(STATE_DIR, '.hammer-log.jsonl');
const TOKEN_FILE = path.join(STATE_DIR, '.hammer-tokens.json');

// ─── Helpers ───
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now() { return new Date().toISOString(); }
function nowMs() { return Date.now(); }

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback || {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback || {}; }
}

function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function appendLog(file, entry) {
  ensureDir(path.dirname(file));
  const line = JSON.stringify({ timestamp: now(), ...entry }) + '\n';
  fs.appendFileSync(file, line, 'utf8');
}

// ─── Init ───
function init({ task, totalAgents, mode } = {}) {
  const sessionId = uuid();
  const state = {
    session_id: sessionId,
    task: task || '未命名任务',
    mode: mode || 'oneshot',
    total_agents: totalAgents || 0,
    completed_agents: 0,
    failed_agents: 0,
    running_agents: [],
    completed: [],
    failed: [],
    started_at: now(),
    last_updated: now(),
  };

  writeJSON(STATUS_FILE, state);
  writeJSON(RETRY_FILE, { entries: {} });

  appendLog(LOG_FILE, { event: 'init', sessionId, task, totalAgents, mode });

  return { ok: true, session_id: sessionId, state };
}

// ─── Agent Spawn ───
function agentSpawn({ team, agent, taskId, sessionId } = {}) {
  const state = readJSON(STATUS_FILE);
  if (!state.session_id && !sessionId) {
    return { ok: false, error: 'No active hammer session. Run init first.' };
  }

  const entry = {
    agent_id: `${team}/${agent}/${taskId || 'unknown'}`,
    team,
    agent,
    task_id: taskId || 'unknown',
    session_id: sessionId || state.session_id,
    spawned_at: now(),
    last_event_at: now(),
    status: 'running',
    attempts: 1,
    output: null,
    tokens_in: 0,
    tokens_out: 0,
    error: null,
  };

  if (!state.running_agents) state.running_agents = [];
  // Remove previous entry for same agent (restart case)
  state.running_agents = state.running_agents.filter(
    a => a.agent_id !== entry.agent_id
  );
  state.running_agents.push(entry);
  state.last_updated = now();

  writeJSON(STATUS_FILE, state);

  // Emit A2A notification
  a2aNotify({ type: 'status', team, agent, status: 'running', message: `Agent ${agent} spawned for ${taskId}` });

  appendLog(LOG_FILE, { event: 'agent_spawn', team, agent, taskId });

  return { ok: true, entry };
}

// ─── Agent Done ───
function agentDone({ team, agent, output, tokensIn, tokensOut } = {}) {
  const state = readJSON(STATUS_FILE);
  if (!state.running_agents) {
    return { ok: false, error: 'No running agents.' };
  }

  const agentId = `${team}/${agent}`;
  const idx = state.running_agents.findIndex(a => a.agent_id.startsWith(agentId));
  if (idx === -1) {
    return { ok: false, error: `Agent ${agentId} not found in running agents.` };
  }

  const entry = state.running_agents[idx];
  entry.status = 'done';
  entry.completed_at = now();
  entry.output = output || null;
  entry.tokens_in = (entry.tokens_in || 0) + (parseInt(tokensIn) || 0);
  entry.tokens_out = (entry.tokens_out || 0) + (parseInt(tokensOut) || 0);
  entry.last_event_at = now();

  // Move to completed
  if (!state.completed) state.completed = [];
  state.completed.push({ ...entry });
  state.running_agents.splice(idx, 1);
  state.completed_agents = (state.completed_agents || 0) + 1;
  state.last_updated = now();

  // Track tokens
  if (tokensIn || tokensOut) {
    tokenTrack({ sessionId: entry.session_id, tokensIn: parseInt(tokensIn) || 0, tokensOut: parseInt(tokensOut) || 0, operation: 'done' });
  }

  writeJSON(STATUS_FILE, state);

  a2aNotify({ type: 'status', team, agent, status: 'done', message: `Agent ${agent} completed`, artifact: output });

  appendLog(LOG_FILE, { event: 'agent_done', team, agent, output, tokensIn, tokensOut });

  return { ok: true, entry };
}

// ─── Agent Fail ───
function agentFail({ team, agent, error, maxAttempts, maxBackoff } = {}) {
  const state = readJSON(STATUS_FILE);
  if (!state.running_agents) {
    return { ok: false, error: 'No running agents.' };
  }

  const agentId = `${team}/${agent}`;
  const idx = state.running_agents.findIndex(a => a.agent_id.startsWith(agentId));
  if (idx === -1) {
    return { ok: false, error: `Agent ${agentId} not found in running agents.` };
  }

  const entry = state.running_agents[idx];
  entry.status = 'failed';
  entry.failed_at = now();
  entry.error = error || 'Unknown error';
  entry.last_event_at = now();

  const attempt = (entry.attempts || 1);
  const maxAttempt = parseInt(maxAttempts) || 3;
  const maxBackoffMs = parseInt(maxBackoff) || 300000;

  if (attempt < maxAttempt) {
    // Add to retry queue with exponential backoff
    const delay = Math.min(10000 * Math.pow(2, attempt - 1), maxBackoffMs);
    const dueAt = nowMs() + delay;

    const retryState = readJSON(RETRY_FILE, { entries: {} });
    retryState.entries[`${team}/${agent}`] = {
      team,
      agent,
      agent_id: entry.agent_id,
      error,
      attempt: attempt + 1,
      max_attempts: maxAttempt,
      delay_ms: delay,
      due_at_ms: dueAt,
      due_at: new Date(dueAt).toISOString(),
      spawned_at: entry.spawned_at,
      _ready: false,
    };
    writeJSON(RETRY_FILE, retryState);

    entry.retry_due_at = new Date(dueAt).toISOString();

    appendLog(LOG_FILE, { event: 'agent_retry_queued', team, agent, attempt, delay, dueAt });
  }

  state.running_agents.splice(idx, 1);
  state.failed_agents = (state.failed_agents || 0) + 1;
  if (!state.failed) state.failed = [];
  state.failed.push({ ...entry });
  state.last_updated = now();

  writeJSON(STATUS_FILE, state);

  a2aNotify({ type: 'status', team, agent, status: 'failed', message: error });

  appendLog(LOG_FILE, { event: 'agent_fail', team, agent, error, attempt });

  return { ok: true, entry, queued_for_retry: attempt < maxAttempt };
}

// ─── Status ───
function getStatus() {
  const state = readJSON(STATUS_FILE);
  const retryState = readJSON(RETRY_FILE, { entries: {} });
  const readyState = readJSON(READY_FILE);

  if (!state.session_id) {
    return { active: false, message: 'No active hammer session.' };
  }

  // Calculate due retries
  const dueRetries = [];
  const pendingRetries = [];
  for (const [key, entry] of Object.entries(retryState.entries || {})) {
    if (entry.due_at_ms <= nowMs()) {
      dueRetries.push(entry);
    } else {
      pendingRetries.push(entry);
    }
  }

  const running = state.running_agents || [];
  const completed = state.completed || [];
  const failed = state.failed || [];

  // Token totals
  const totalTokensIn = completed.reduce((s, a) => s + (a.tokens_in || 0), 0)
    + failed.reduce((s, a) => s + (a.tokens_in || 0), 0);
  const totalTokensOut = completed.reduce((s, a) => s + (a.tokens_out || 0), 0)
    + failed.reduce((s, a) => s + (a.tokens_out || 0), 0);

  // Per team breakdown
  const teams = { red: { running: 0, done: 0, failed: 0 }, blue: { running: 0, done: 0, failed: 0 }, green: { running: 0, done: 0, failed: 0 } };
  for (const a of running) { if (teams[a.team]) teams[a.team].running++; }
  for (const a of completed) { if (teams[a.team]) teams[a.team].done++; }
  for (const a of failed) { if (teams[a.team]) teams[a.team].failed++; }

  return {
    active: true,
    task: state.task,
    mode: state.mode,
    session_id: state.session_id,
    started_at: state.started_at,
    last_updated: state.last_updated,
    counts: {
      total: state.total_agents || 0,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
    },
    teams,
    tokens: {
      total_in: totalTokensIn,
      total_out: totalTokensOut,
    },
    retry: {
      due: dueRetries.length,
      pending: pendingRetries.length,
    },
    ready: readyState.tasks ? readyState.tasks.length : 0,
    running_agents: running.map(a => ({
      id: a.agent_id,
      team: a.team,
      agent: a.agent,
      stage: a.task_id,
      spawned: a.spawned_at,
      elapsed: Math.round((nowMs() - new Date(a.spawned_at).getTime()) / 1000) + 's',
      retry_due: a.retry_due_at || null,
    })),
  };
}

// ─── Summary ───
function getSummary({ task } = {}) {
  const state = readJSON(STATUS_FILE);
  const status = getStatus();

  if (!status.active) {
    return { ok: false, error: 'No active session.' };
  }

  const completed = state.completed || [];
  const failed = state.failed || [];

  // Group by team
  const teamOutputs = { red: [], blue: [], green: [] };
  for (const a of completed) {
    if (teamOutputs[a.team]) {
      teamOutputs[a.team].push({ agent: a.agent, stage: a.task_id, output: a.output, tokens: `${a.tokens_in}+${a.tokens_out}` });
    }
  }

  return {
    ok: true,
    task: task || state.task,
    session_id: state.session_id,
    started_at: state.started_at,
    completed_at: now(),
    duration: Math.round((nowMs() - new Date(state.started_at).getTime()) / 1000) + 's',
    counts: status.counts,
    tokens: status.tokens,
    team_outputs: teamOutputs,
    failures: failed.map(a => ({ team: a.team, agent: a.agent, error: a.error })),
  };
}

// ─── Stall Detect ───
function stallDetect({ stallMs } = {}) {
  const state = readJSON(STATUS_FILE);
  const stallThreshold = parseInt(stallMs) || 300000;
  const stalled = [];

  if (!state.running_agents) return { stalled: [] };

  const nowMsVal = nowMs();
  for (const agent of state.running_agents) {
    const lastEvent = new Date(agent.last_event_at || agent.spawned_at).getTime();
    const elapsed = nowMsVal - lastEvent;
    if (elapsed > stallThreshold) {
      stalled.push({
        agent_id: agent.agent_id,
        team: agent.team,
        agent: agent.agent,
        elapsed_ms: elapsed,
        elapsed_s: Math.round(elapsed / 1000),
        spawned_at: agent.spawned_at,
        last_event_at: agent.last_event_at,
      });
    }
  }

  // Update ready file with stalled info
  const readyState = readJSON(READY_FILE);
  readyState.stalled = stalled;
  readyState.last_tick = nowMsVal;
  writeJSON(READY_FILE, readyState);

  return { stalled, count: stalled.length };
}

// ─── Retry ───
function getRetries({ team, agent } = {}) {
  const retryState = readJSON(RETRY_FILE, { entries: {} });
  const entries = Object.entries(retryState.entries || {});

  let filtered = entries;
  if (team) {
    filtered = filtered.filter(([k]) => k.startsWith(`${team}/`));
  }
  if (agent) {
    filtered = filtered.filter(([k]) => k === `${team}/${agent}`);
  }

  const due = [];
  const pending = [];
  for (const [key, entry] of filtered) {
    if (entry.due_at_ms <= nowMs()) {
      due.push({ key, ...entry });
    } else {
      pending.push({ key, ...entry });
    }
  }

  // Mark ready entries
  const retryStateWritable = readJSON(RETRY_FILE, { entries: {} });
  for (const d of due) {
    if (retryStateWritable.entries[d.key]) {
      retryStateWritable.entries[d.key]._ready = true;
    }
  }
  writeJSON(RETRY_FILE, retryStateWritable);

  return { due, pending, total: entries.length };
}

function triggerRetry({ team, agent } = {}) {
  const retryState = readJSON(RETRY_FILE, { entries: {} });
  const key = `${team}/${agent}`;
  const entry = retryState.entries[key];
  if (!entry) {
    return { ok: false, error: `No retry entry for ${key}` };
  }

  // Set due time to now (immediate)
  entry.due_at_ms = nowMs();
  entry._ready = true;
  writeJSON(RETRY_FILE, retryState);

  return { ok: true, entry };
}

function clearRetry({ team, agent } = {}) {
  const retryState = readJSON(RETRY_FILE, { entries: {} });
  const key = `${team}/${agent}`;
  if (retryState.entries[key]) {
    delete retryState.entries[key];
    writeJSON(RETRY_FILE, retryState);
  }
  return { ok: true };
}

// ─── A2A Notify ───
function a2aNotify({ type, team, agent, status, message, artifact } = {}) {
  ensureDir(A2A_DIR);
  const notification = {
    id: uuid(),
    type: type || 'status',
    team,
    agent,
    status,
    message: message || '',
    artifact: artifact || null,
    timestamp: now(),
  };

  const fileName = `${now().replace(/[:.]/g, '-')}-${notification.id.substring(0, 8)}.json`;
  fs.writeFileSync(path.join(A2A_DIR, fileName), JSON.stringify(notification, null, 2), 'utf8');

  // Also append to log
  appendLog(LOG_FILE, { event: 'a2a_notify', ...notification });

  return { ok: true, notification };
}

function readA2ANotifications() {
  ensureDir(A2A_DIR);
  const files = fs.readdirSync(A2A_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .slice(-50); // Last 50
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(A2A_DIR, f), 'utf8'));
    } catch { return null; }
  }).filter(Boolean);
}

// ─── A2A Task ───
function a2aTask({ description, fromAgent, priority } = {}) {
  ensureDir(QUEUE_DIR);
  const taskEntry = {
    id: uuid(),
    description: description || '',
    from_agent: fromAgent || 'unknown',
    priority: parseInt(priority) || 0,
    status: 'pending',
    created_at: now(),
  };

  const fileName = `task-${Date.now()}-${taskEntry.id.substring(0, 8)}.json`;
  fs.writeFileSync(path.join(QUEUE_DIR, fileName), JSON.stringify(taskEntry, null, 2), 'utf8');

  appendLog(LOG_FILE, { event: 'a2a_task_created', ...taskEntry });

  return { ok: true, task: taskEntry };
}

// ─── Fix Protocol ───
function fixRecord({ type, severity, source, task, error, rootCause, fix, prevent } = {}) {
  ensureDir(FIX_PROTOCOL_DIR);

  const slug = (error || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const date = new Date().toISOString().substring(0, 10);
  const fileId = uuid().substring(0, 8);
  const fileName = `${date}-${slug}-${fileId}.md`;
  const filePath = path.join(FIX_PROTOCOL_DIR, fileName);

  const content = `---
type: ${type || 'unknown'}
severity: ${severity || 'P1'}
source: ${source || 'unknown'}
task: "${task || 'unknown'}"
date: ${date}
---

# 修复记录: ${error || 'Unknown error'}

## 错误描述
${error || 'N/A'}

## 根因分析
${rootCause || 'N/A'}

## 修复方案
${fix || 'N/A'}

## 预防措施
${prevent || 'N/A'}
`;

  fs.writeFileSync(filePath, content, 'utf8');

  // Update INDEX.md
  updateFixProtocolIndex();

  appendLog(LOG_FILE, { event: 'fix_record', type, severity, source, path: filePath });

  return { ok: true, path: filePath };
}

function fixSearch({ type, limit } = {}) {
  ensureDir(FIX_PROTOCOL_DIR);
  const files = fs.readdirSync(FIX_PROTOCOL_DIR)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .sort()
    .reverse();

  const results = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(FIX_PROTOCOL_DIR, f), 'utf8');
    const frontmatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatch) continue;

    const frontmatter = {};
    for (const line of frontmatch[1].split('\n')) {
      const [k, ...v] = line.split(': ');
      frontmatter[k.trim()] = v.join(': ').replace(/^"/, '').replace(/"$/, '');
    }

    if (type && frontmatter.type !== type) continue;
    results.push({ file: f, ...frontmatter, summary: content.split('\n').slice(6, 8).join('\n').replace(/^# /, '') });
  }

  const limited = results.slice(0, parseInt(limit) || 10);

  return { ok: true, records: limited, total: results.length };
}

function updateFixProtocolIndex() {
  ensureDir(FIX_PROTOCOL_DIR);
  const allRecords = fixSearch({});
  const records = allRecords.records || [];

  // Group by type
  const byType = {};
  for (const r of records) {
    const t = r.type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(r);
  }

  const typeRows = Object.entries(byType).map(([type, items]) => {
    const latest = items[0]?.date || '—';
    return `| ${type} | ${items.length} | ${latest} |`;
  }).join('\n');

  const content = `# Fix Protocol — 活修复协议

> 对标 OpenGame Debug Skill: 维护一个持续更新的已验证修复协议。
> 每次 Stage 3/3.5 发现的 bug 和修复方案都被记录，下次编码时自动检索避免重复踩坑。

## 索引结构

| 错误类型 | 条目数 | 最近记录 |
|---------|-------|---------|
${typeRows || '| — | 0 | — |'}

## 用途

- **Stage 3 集成测试**发现 bug 时 → \`node {IDE_ROOT}/helpers/hammer-bridge.cjs fix-record\` 记录
- **Stage 3.5 运行时验证**发现运行时错误时 → 自动记录
- **下次 Stage 2 编码**时 → 自动检索匹配的修复协议 → 注入编码 prompt
- **查询** → \`node {IDE_ROOT}/helpers/hammer-bridge.cjs fix-search --type <类型>\`

## 最近记录

${records.slice(0, 10).map(r => `- [${r.date}] **${r.type}** (${r.severity}): ${r.summary || r.error || 'N/A'} — \`${r.file}\``).join('\n') || '(无记录)'}
`;

  fs.writeFileSync(path.join(FIX_PROTOCOL_DIR, 'INDEX.md'), content, 'utf8');
}

// ─── Prefix ───
function getPrefix() {
  const prefixPath = path.join(ROOT, '.claude', 'skills', 'kf-multi-team-compete', 'agent-prompt-prefix.md');
  if (!fs.existsSync(prefixPath)) {
    return { ok: false, error: 'agent-prompt-prefix.md not found' };
  }
  const content = fs.readFileSync(prefixPath, 'utf8');

  // Extract the template section (between the first template code block)
  const templateMatch = content.match(/### 模板内容\n\n```\n([\s\S]*?)```/);
  if (templateMatch) {
    return { ok: true, prefix: templateMatch[1].trim() };
  }

  return { ok: true, prefix: content };
}

// ─── Skill Routing Table ───
function getSkillRoutingTable({ stage, agentRole } = {}) {
  const routerPath = path.join(__dirname, 'skill-router.cjs');
  if (!fs.existsSync(routerPath)) {
    return { ok: false, error: 'skill-router.cjs not found' };
  }

  try {
    const { generateRoutingTable } = require(routerPath);
    const table = generateRoutingTable({ stage: String(stage), agentRole: agentRole || '' });
    return { ok: true, table };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Token Track ───
let _tokenCache = null;

function tokenTrack({ sessionId, tokensIn, tokensOut, operation } = {}) {
  const tokenState = readJSON(TOKEN_FILE, { sessions: {}, totals: { in: 0, out: 0 } });

  if (operation === 'reset') {
    writeJSON(TOKEN_FILE, { sessions: {}, totals: { in: 0, out: 0 } });
    return { ok: true, totals: { in: 0, out: 0 } };
  }

  if (sessionId) {
    if (!tokenState.sessions[sessionId]) {
      tokenState.sessions[sessionId] = { in: 0, out: 0 };
    }
    tokenState.sessions[sessionId].in += parseInt(tokensIn) || 0;
    tokenState.sessions[sessionId].out += parseInt(tokensOut) || 0;
  }

  tokenState.totals.in += parseInt(tokensIn) || 0;
  tokenState.totals.out += parseInt(tokensOut) || 0;

  writeJSON(TOKEN_FILE, tokenState);
  _tokenCache = null;

  return { ok: true, totals: tokenState.totals, sessions: tokenState.sessions };
}

function getTokenStats() {
  return readJSON(TOKEN_FILE, { sessions: {}, totals: { in: 0, out: 0 } });
}

// ─── API State (for Monitor) ───
function apiState() {
  const status = getStatus();
  const tokenStats = getTokenStats();

  return {
    status: status.active ? 'running' : 'idle',
    task: status.task || null,
    session_id: status.session_id || null,
    started_at: status.started_at || null,
    counts: status.active ? status.counts : { total: 0, running: 0, completed: 0, failed: 0 },
    teams: status.active ? status.teams : { red: { running: 0, done: 0, failed: 0 }, blue: { running: 0, done: 0, failed: 0 }, green: { running: 0, done: 0, failed: 0 } },
    tokens: {
      total_in: tokenStats.totals.in,
      total_out: tokenStats.totals.out,
      sessions: tokenStats.sessions,
    },
    retry: status.active ? status.retry : { due: 0, pending: 0 },
    running_agents: status.active ? status.running_agents : [],
  };
}

// ─── Watch ───
function watch({ interval } = {}) {
  const state = readJSON(STATUS_FILE);
  state.mode = 'watch';
  state.watch_interval_ms = parseInt(interval) || 30000;
  state.watch_started_at = now();
  writeJSON(STATUS_FILE, state);

  // Write PID file
  const pidFile = path.join(STATE_DIR, '.hammer-watch.pid');
  fs.writeFileSync(pidFile, String(process.pid), 'utf8');

  appendLog(LOG_FILE, { event: 'watch_started', interval: state.watch_interval_ms });

  return { ok: true, pid: process.pid, interval: state.watch_interval_ms };
}

// ─── CLI ───
function cli() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('hammer-bridge.cjs v3 — 夯 核心编排助手');
    console.log('');
    console.log('用法: node hammer-bridge.cjs <command> [options]');
    console.log('');
    console.log('命令:');
    console.log('  init           初始化新夯会话');
    console.log('  agent-spawn    记录 Agent 创建');
    console.log('  agent-done     标记 Agent 完成');
    console.log('  agent-fail     标记 Agent 失败');
    console.log('  status         查看聚合状态');
    console.log('  summary        生成最终摘要');
    console.log('  stall-detect   失活检测');
    console.log('  retry          列出/触发重试');
    console.log('  a2a-notify     Agent 通知');
    console.log('  a2a-task       Agent 提交任务');
    console.log('  fix-record     记录修复协议');
    console.log('  fix-search     搜索修复协议');
    console.log('  prefix         输出共享前缀');
    console.log('  skill-routing  输出阶段技能路由表  --stage <N> --role "<角色>"');
    console.log('  token-track    Token 追踪');
    console.log('  api-state      输出 Monitor API 状态');
    console.log('  watch          Watch 模式');
    process.exit(0);
  }

  const cmd = args[0];
  const rest = args.slice(1);

  function getopt(name, fallback) {
    const idx = rest.indexOf(name);
    if (idx === -1) return fallback;
    return rest[idx + 1] || fallback;
  }

  function hasopt(name) {
    return rest.includes(name);
  }

  try {
    switch (cmd) {
      case 'init': {
        const result = init({
          task: getopt('--task', getopt('-t', '未命名任务')),
          totalAgents: parseInt(getopt('--total-agents', getopt('-n', '0'))),
          mode: getopt('--mode', getopt('-m', 'oneshot')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'agent-spawn':
      case 'spawn': {
        const result = agentSpawn({
          team: getopt('--team'),
          agent: getopt('--agent'),
          taskId: getopt('--task-id', getopt('--stage')),
          sessionId: getopt('--session-id'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'agent-done':
      case 'done': {
        const result = agentDone({
          team: getopt('--team'),
          agent: getopt('--agent'),
          output: getopt('--output', getopt('-o')),
          tokensIn: getopt('--tokens-in'),
          tokensOut: getopt('--tokens-out'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'agent-fail':
      case 'fail': {
        const result = agentFail({
          team: getopt('--team'),
          agent: getopt('--agent'),
          error: getopt('--error', getopt('-e', 'Unknown error')),
          maxAttempts: getopt('--max-attempts', '3'),
          maxBackoff: getopt('--max-backoff', '300000'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'status': {
        const result = getStatus();
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'summary': {
        const result = getSummary({
          task: getopt('--task', getopt('-t')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'stall-detect': {
        const result = stallDetect({
          stallMs: getopt('--stall-ms', '300000'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.count > 0 ? 2 : 0);
      }

      case 'retry': {
        if (hasopt('--trigger') || hasopt('--fire')) {
          const result = triggerRetry({
            team: getopt('--team'),
            agent: getopt('--agent'),
          });
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.ok ? 0 : 1);
        }
        if (hasopt('--clear')) {
          const result = clearRetry({
            team: getopt('--team'),
            agent: getopt('--agent'),
          });
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        }
        const result = getRetries({
          team: getopt('--team'),
          agent: getopt('--agent'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'a2a-notify':
      case 'notify': {
        const result = a2aNotify({
          type: getopt('--type', 'status'),
          team: getopt('--team'),
          agent: getopt('--agent'),
          status: getopt('--status'),
          message: getopt('--message', getopt('-m', '')),
          artifact: getopt('--artifact'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'a2a-task':
      case 'new-task': {
        const result = a2aTask({
          description: getopt('--description', getopt('-d', '')),
          fromAgent: getopt('--from-agent', getopt('--from', 'unknown')),
          priority: getopt('--priority', getopt('-p', '0')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'fix-record':
      case 'record': {
        const result = fixRecord({
          type: getopt('--type', getopt('-t', 'unknown')),
          severity: getopt('--severity', getopt('-s', 'P1')),
          source: getopt('--source'),
          task: getopt('--task'),
          error: getopt('--error', getopt('-e', '')),
          rootCause: getopt('--root-cause', getopt('--root', '')),
          fix: getopt('--fix', getopt('-f', '')),
          prevent: getopt('--prevent', getopt('-p', '')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'fix-search':
      case 'search': {
        const result = fixSearch({
          type: getopt('--type', getopt('-t')),
          limit: getopt('--limit', getopt('-n', '10')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'prefix': {
        const result = getPrefix();
        if (result.ok) {
          console.log(result.prefix);
          process.exit(0);
        } else {
          console.error(result.error);
          process.exit(1);
        }
      }

      case 'skill-routing':
      case 'routing': {
        const result = getSkillRoutingTable({
          stage: getopt('--stage', getopt('-s', '0')),
          agentRole: getopt('--role', getopt('-r', '')),
        });
        if (result.ok) {
          console.log(result.table);
          process.exit(0);
        } else {
          console.error(JSON.stringify(result, null, 2));
          process.exit(1);
        }
      }

      case 'token-track':
      case 'tokens': {
        if (hasopt('--reset')) {
          const result = tokenTrack({ operation: 'reset' });
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        }
        if (hasopt('--add') || hasopt('--report')) {
          const result = tokenTrack({
            sessionId: getopt('--add', getopt('--session')),
            tokensIn: getopt('--tokens-in', getopt('--in', '0')),
            tokensOut: getopt('--tokens-out', getopt('--out', '0')),
          });
          console.log(JSON.stringify(result, null, 2));
          process.exit(0);
        }
        const stats = getTokenStats();
        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
      }

      case 'api-state':
      case 'api': {
        const result = apiState();
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'watch': {
        const result = watch({
          interval: getopt('--interval', getopt('-i', '30000')),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      default: {
        console.error(`Unknown command: ${cmd}`);
        console.error('Run without arguments to see usage.');
        process.exit(1);
      }
    }
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.message, stack: e.stack }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  cli();
}

module.exports = {
  init,
  agentSpawn,
  agentDone,
  agentFail,
  getStatus,
  getSummary,
  stallDetect,
  getRetries,
  triggerRetry,
  clearRetry,
  a2aNotify,
  readA2ANotifications,
  a2aTask,
  fixRecord,
  fixSearch,
  getPrefix,
  getSkillRoutingTable,
  tokenTrack,
  getTokenStats,
  apiState,
  watch,
};

