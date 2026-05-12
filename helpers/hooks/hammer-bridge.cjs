#!/usr/bin/env node
/**
 * hammer-bridge.cjs — /夯 桥接层 v2 (Symphony-inspired)
 *
 * 桥接 Claude Code 内置 Agent 工具和 ruflo swarm 面板之间的状态鸿沟。
 *
 * v2 新增（Symphony 融合）：
 *   - watch:    守护循环，持续轮询任务队列并自动触发
 *   - retry:    指数退避重试队列管理
 *   - stall:    失活检测与自动终止
 *   - api-state: Symphony 兼容的 JSON 运行时快照
 *   - token-track: Orchestrator 级 Token 聚合追踪
 *
 * 用法：
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-spawn --team red --agent fullstack --task-id T1
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-done --team red --agent fullstack --output red-01.md
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-fail --team red --agent fullstack --error "stall timeout"
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs status
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs summary --task "Claude Code UX改进"
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs watch --interval 30000
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs retry --issue-id T1 --team red
 *   node {IDE_ROOT}/helpers/hammer-bridge.cjs api-state
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const BRIDGE_DIR = path.join(PROJECT_ROOT, '.claude-flow', 'hammer-state');
const STATUS_FILE = path.join(BRIDGE_DIR, '.hammer-status.json');
const LOG_FILE = path.join(BRIDGE_DIR, '.hammer-log.jsonl');
const RETRY_FILE = path.join(BRIDGE_DIR, '.hammer-retry.json');
const TOKEN_FILE = path.join(BRIDGE_DIR, '.hammer-tokens.json');
const FIX_PROTOCOL_DIR = path.resolve(__dirname, '..', '..', 'fix-protocol');
const FIX_INDEX_FILE = path.join(FIX_PROTOCOL_DIR, 'INDEX.md');

// ============ 工具函数 ============

function ensureDir() {
  if (!fs.existsSync(BRIDGE_DIR)) {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
  }
}

function readStatus() {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
  } catch {
    return {
      task: '',
      phase: 0,
      startedAt: null,
      teams: {},
      totalAgents: 0,
      completedAgents: 0,
      failedAgents: 0,
      mode: 'oneshot'
    };
  }
}

function writeStatus(status) {
  ensureDir();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
}

function readRetryState() {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(RETRY_FILE, 'utf-8'));
  } catch {
    return { entries: {} };
  }
}

function writeRetryState(state) {
  ensureDir();
  fs.writeFileSync(RETRY_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function readTokens() {
  ensureDir();
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  } catch {
    return {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0,
      sessions: {}
    };
  }
}

function writeTokens(tokens) {
  ensureDir();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

function appendLog(entry) {
  ensureDir();
  entry.timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

function progressBar(current, total) {
  const width = 20;
  if (total === 0) return '░'.repeat(width) + ' 0/0';
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${current}/${total}`;
}

/**
 * 指数退避计算
 * delay = min(10000 * 2^(attempt - 1), maxBackoffMs)
 */
function calcBackoff(attempt, maxBackoffMs = 300000) {
  return Math.min(10000 * Math.pow(2, attempt - 1), maxBackoffMs);
}

function nowMs() {
  return Date.now();
}

function dueAt(attempt, maxBackoffMs) {
  return nowMs() + calcBackoff(attempt, maxBackoffMs);
}

// ============ 命令处理 ============

const args = process.argv.slice(2);
const cmd = args[0];

function getOpt(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
}

switch (cmd) {

  // ---- agent-spawn: 记录 Agent 启动 ----
  case 'agent-spawn': {
    const team = getOpt('team') || 'unknown';
    const agent = getOpt('agent') || 'unknown';
    const taskId = getOpt('task-id') || '?';
    const sessionId = getOpt('session-id') || null;
    const status = readStatus();

    if (!status.startedAt) {
      status.startedAt = new Date().toISOString();
      status.phase = 2;
    }

    const key = `${team}/${agent}`;
    if (!status.teams[team]) status.teams[team] = { agents: {}, done: 0, total: 0, failed: 0 };
    status.teams[team].agents[agent] = {
      status: 'running',
      taskId,
      startedAt: new Date().toISOString(),
      sessionId,
      attempt: (status.teams[team].agents[agent]?.attempt || 0) + 1,
      output: null,
      error: null,
      tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
    };
    status.teams[team].total = Object.keys(status.teams[team].agents).length;
    status.totalAgents = Object.values(status.teams).reduce((s, t) => s + t.total, 0);

    writeStatus(status);
    appendLog({ event: 'agent-spawn', team, agent, taskId, sessionId,
      attempt: status.teams[team].agents[agent].attempt });

    console.log(`[hammer-bridge] ${team}/${agent} → spawned (attempt ${status.teams[team].agents[agent].attempt}, 共 ${status.totalAgents} agents)`);
    break;
  }

  // ---- agent-done: 记录 Agent 完成 ----
  case 'agent-done': {
    const team = getOpt('team') || 'unknown';
    const agent = getOpt('agent') || 'unknown';
    const output = getOpt('output') || null;
    const tokensIn = parseInt(getOpt('tokens-in') || '0', 10);
    const tokensOut = parseInt(getOpt('tokens-out') || '0', 10);
    const status = readStatus();

    if (status.teams[team] && status.teams[team].agents[agent]) {
      const a = status.teams[team].agents[agent];
      a.status = 'done';
      a.output = output;
      a.completedAt = new Date().toISOString();
      a.tokens.input_tokens += tokensIn;
      a.tokens.output_tokens += tokensOut;
      a.tokens.total_tokens += tokensIn + tokensOut;
      status.teams[team].done += 1;
      status.completedAgents = Object.values(status.teams).reduce((s, t) => s + t.done, 0);
    }

    // Clear retry entry if exists
    const retryState = readRetryState();
    const retryKey = `${team}/${agent}`;
    if (retryState.entries[retryKey]) {
      delete retryState.entries[retryKey];
      writeRetryState(retryState);
    }

    // Update token totals
    _accumulateTokens(tokensIn, tokensOut, team, agent);

    // 检查阶段是否完成
    const totalDone = Object.values(status.teams).reduce((s, t) => s + t.done, 0);
    if (totalDone === status.totalAgents && status.phase === 2) {
      status.phase = 3;
    }

    writeStatus(status);
    appendLog({ event: 'agent-done', team, agent, output, tokensIn, tokensOut });

    console.log(`[hammer-bridge] ${team}/${agent} → done (${status.completedAgents}/${status.totalAgents})`);
    break;
  }

  // ---- agent-fail: 记录 Agent 失败（触发重试逻辑） ----
  case 'agent-fail': {
    const team = getOpt('team') || 'unknown';
    const agent = getOpt('agent') || 'unknown';
    const error = getOpt('error') || 'unknown';
    const maxBackoff = parseInt(getOpt('max-backoff') || '300000', 10);
    const maxAttempts = parseInt(getOpt('max-attempts') || '3', 10);
    const status = readStatus();

    if (status.teams[team] && status.teams[team].agents[agent]) {
      const a = status.teams[team].agents[agent];
      a.status = 'failed';
      a.error = error;
      a.completedAt = new Date().toISOString();
      status.teams[team].failed += 1;
      status.failedAgents = Object.values(status.teams).reduce((s, t) => s + (t.failed || 0), 0);
    }

    // Enqueue retry
    const retryState = readRetryState();
    const retryKey = `${team}/${agent}`;
    const currentAttempt = status.teams[team].agents[agent]?.attempt || 1;

    if (currentAttempt < maxAttempts) {
      const nextAttempt = currentAttempt + 1;
      retryState.entries[retryKey] = {
        team,
        agent,
        attempt: nextAttempt,
        error,
        due_at_ms: dueAt(nextAttempt, maxBackoff),
        backoff_ms: calcBackoff(nextAttempt, maxBackoff),
        max_attempts: maxAttempts
      };
      appendLog({ event: 'retry-enqueue', team, agent, attempt: nextAttempt,
        backoff_ms: calcBackoff(nextAttempt, maxBackoff), due_at: new Date(dueAt(nextAttempt, maxBackoff)).toISOString() });
      console.log(`[hammer-bridge] ${team}/${agent} → failed, retry ${nextAttempt}/${maxAttempts} enqueued (backoff ${calcBackoff(nextAttempt, maxBackoff)}ms)`);
    } else {
      // Max retries exhausted
      if (retryState.entries[retryKey]) delete retryState.entries[retryKey];
      a.status = 'exhausted';
      appendLog({ event: 'retry-exhausted', team, agent, attempts: currentAttempt, error });
      console.log(`[hammer-bridge] ${team}/${agent} → all ${maxAttempts} retries exhausted: ${error}`);
    }

    writeRetryState(retryState);
    writeStatus(status);
    break;
  }

  // ---- retry: 手动触发重试（或检查到期）----
  case 'retry': {
    const team = getOpt('team');
    const agent = getOpt('agent');
    const retryState = readRetryState();

    if (team && agent) {
      // Manual retry for specific agent
      const retryKey = `${team}/${agent}`;
      const entry = retryState.entries[retryKey];
      if (entry) {
        entry.due_at_ms = nowMs(); // force immediate
        writeRetryState(retryState);
        console.log(`[hammer-bridge] Retry forced for ${retryKey} (attempt ${entry.attempt})`);
      } else {
        console.log(`[hammer-bridge] No retry entry for ${retryKey}`);
      }
    } else {
      // List all pending retries
      console.log('[hammer-bridge] Pending retries:');
      const pending = Object.entries(retryState.entries)
        .filter(([, e]) => e.due_at_ms <= nowMs())
        .sort(([, a], [, b]) => a.due_at_ms - b.due_at_ms);

      if (pending.length === 0) {
        console.log('  (none due)');
      } else {
        pending.forEach(([key, entry]) => {
          const remaining = Math.max(0, Math.round((entry.due_at_ms - nowMs()) / 1000));
          console.log(`  ${key} — attempt ${entry.attempt}/${entry.max_attempts} — due in ${remaining}s — ${entry.error}`);
        });
      }
    }
    break;
  }

  // ---- stall-detect: 失活检测 ----
  case 'stall-detect': {
    const stallMs = parseInt(getOpt('stall-ms') || '300000', 10);
    const status = readStatus();
    const now = nowMs();
    const stalled = [];

    for (const [teamName, team] of Object.entries(status.teams)) {
      for (const [agentName, agent] of Object.entries(team.agents)) {
        if (agent.status !== 'running') continue;
        const lastEventTime = agent.completedAt
          ? new Date(agent.completedAt).getTime()
          : new Date(agent.startedAt).getTime();
        const elapsed = now - lastEventTime;
        if (elapsed > stallMs) {
          stalled.push({ team: teamName, agent: agentName, elapsed_ms: elapsed, taskId: agent.taskId });
        }
      }
    }

    if (stalled.length > 0) {
      console.log(`[hammer-bridge] ⚠️ ${stalled.length} stalled agent(s) detected:`);
      stalled.forEach(s => {
        console.log(`  ${s.team}/${s.agent} — stalled ${Math.round(s.elapsed_ms / 1000)}s — ${s.taskId}`);
      });
    } else {
      console.log('[hammer-bridge] No stalled agents detected');
    }
    break;
  }

  // ---- token-track: Token 聚合追踪 ----
  case 'token-track': {
    const tokensIn = parseInt(getOpt('tokens-in') || '0', 10);
    const tokensOut = parseInt(getOpt('tokens-out') || '0', 10);
    const team = getOpt('team') || 'unknown';
    const agent = getOpt('agent') || 'unknown';
    const sessionId = getOpt('session-id');

    _accumulateTokens(tokensIn, tokensOut, team, agent, sessionId);
    console.log(`[hammer-bridge] Tokens tracked: +${tokensIn} in / +${tokensOut} out (${team}/${agent})`);
    break;
  }

  // ---- api-state: Symphony 兼容的 JSON 运行时快照 ----
  case 'api-state': {
    const status = readStatus();
    const retryState = readRetryState();
    const tokens = readTokens();

    const running = [];
    const retrying = [];

    for (const [teamName, team] of Object.entries(status.teams)) {
      for (const [agentName, agent] of Object.entries(team.agents)) {
        if (agent.status === 'running') {
          running.push({
            team: teamName,
            agent: agentName,
            task_id: agent.taskId,
            session_id: agent.sessionId || null,
            turn_count: agent.turnCount || 1,
            last_event: agent.lastEvent || 'running',
            last_message: agent.lastMessage || '',
            started_at: agent.startedAt,
            last_event_at: agent.completedAt || agent.startedAt,
            attempt: agent.attempt || 1,
            tokens: agent.tokens || { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
          });
        }
      }
    }

    for (const [key, entry] of Object.entries(retryState.entries)) {
      retrying.push({
        key,
        team: entry.team,
        agent: entry.agent,
        attempt: entry.attempt,
        due_at: new Date(entry.due_at_ms).toISOString(),
        backoff_ms: entry.backoff_ms,
        max_attempts: entry.max_attempts,
        error: entry.error
      });
    }

    const result = {
      generated_at: new Date().toISOString(),
      mode: status.mode || 'oneshot',
      phase: status.phase,
      task: status.task || '(unnamed)',
      counts: {
        running: running.length,
        retrying: retrying.length,
        total: status.totalAgents || 0,
        completed: status.completedAgents || 0,
        failed: status.failedAgents || 0
      },
      running,
      retrying,
      codex_totals: {
        input_tokens: tokens.input_tokens,
        output_tokens: tokens.output_tokens,
        total_tokens: tokens.total_tokens,
        seconds_running: tokens.seconds_running
      },
      rate_limits: null,
      teams: Object.entries(status.teams).map(([name, team]) => ({
        name,
        done: team.done || 0,
        total: team.total || 0,
        failed: team.failed || 0,
        agents: Object.entries(team.agents).map(([aname, a]) => ({
          name: aname,
          status: a.status,
          attempt: a.attempt || 1,
          task: a.taskId,
          error: a.error || null
        }))
      }))
    };

    console.log(JSON.stringify(result, null, 2));
    break;
  }

  // ---- status: 输出当前状态 ----
  case 'status': {
    const status = readStatus();
    const retryState = readRetryState();
    const tokens = readTokens();

    if (!status.startedAt) {
      console.log('[hammer-bridge] 无正在执行的 /夯 任务');
      console.log('  模式: ' + (status.mode === 'watch' ? '守护(daemon)' : '单次(oneshot)'));
      console.log('  面板计数: 0/0 (ruflo 桥接模式 — 实际 Agent 通过 Claude Code 内置工具执行)');
      return;
    }

    const elapsed = Date.now() - new Date(status.startedAt).getTime();
    const elapsedStr = `${Math.floor(elapsed / 1000)}s`;
    const stalledCount = _countStalled(status);
    const retryCount = Object.keys(retryState.entries).length;

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  🔨 /夯 执行状态 (v2 Symphony)');
    console.log('═══════════════════════════════════════════════');
    console.log(`  任务: ${status.task || '(未命名)'}`);
    console.log(`  模式: ${status.mode === 'watch' ? '🔁 守护(daemon)' : '▶️  单次(oneshot)'}`);
    console.log(`  阶段: Phase ${status.phase}/6`);
    console.log(`  耗时: ${elapsedStr}`);
    console.log(`  进度: ${progressBar(status.completedAgents, status.totalAgents)}`);
    if (stalledCount > 0) console.log(`  ⚠️  失活: ${stalledCount} 个 agent 疑似无响应`);
    if (retryCount > 0) console.log(`  🔄 重试队列: ${retryCount} 个待重试`);
    console.log(`  💰 Token: ${(tokens.total_tokens / 1000).toFixed(1)}K total`);
    console.log('');

    for (const [teamName, team] of Object.entries(status.teams)) {
      const done = team.done || 0;
      const total = team.total || 0;
      const failed = team.failed || 0;
      const icon = done === total ? '✅' : done > 0 ? '🔄' : '⏳';
      let extra = '';
      if (failed > 0) extra += ` (${failed} failed, retrying)`;
      console.log(`  ${icon} ${teamName}队: ${progressBar(done, total)}${extra}`);
      for (const [agentName, agent] of Object.entries(team.agents)) {
        let s;
        if (agent.status === 'done') s = '✅';
        else if (agent.status === 'failed') s = '🔴';
        else if (agent.status === 'exhausted') s = '💀';
        else if (agent.status === 'running') s = '🔄';
        else s = '⏳';
        let detail = agent.taskId;
        if (agent.attempt > 1) detail += ` (重试#${agent.attempt})`;
        if (agent.error) detail += ` — ${agent.error.slice(0, 40)}`;
        console.log(`     ${s} ${agentName} — ${detail}`);
      }
    }

    console.log('');
    console.log('  注: ruflo swarm 面板显示 0/15 是正常的 — 实际 Agent 通过 Claude Code 内置工具并行执行');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    break;
  }

  // ---- summary: 生成执行摘要 ----
  case 'summary': {
    const task = getOpt('task') || '(未命名)';
    const status = readStatus();
    const retryState = readRetryState();
    const tokens = readTokens();

    if (!status.startedAt) {
      console.log('[hammer-bridge] 无执行记录');
      return;
    }

    const elapsed = Date.now() - new Date(status.startedAt).getTime();
    ensureDir();

    const retryEntries = Object.entries(retryState.entries);
    const retriedAgents = retryEntries.length;
    const exhausted = Object.values(status.teams)
      .reduce((sum, t) => sum + Object.values(t.agents).filter(a => a.status === 'exhausted').length, 0);

    const summaryMd = [
      `# /夯 执行摘要`,
      '',
      `> 任务: ${task}`,
      `> 时间: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
      `> 耗时: ${Math.floor(elapsed / 1000)}s`,
      `> 模式: ${status.mode === 'watch' ? '守护(daemon)' : '单次(oneshot)'}`,
      `> 桥接模式: Claude Code Agent Tools (ruflo 桥接) v2 Symphony`,
      '',
      '## 执行统计',
      '',
      `| 指标 | 值 |`,
      `|------|-----|`,
      `| 参与 Agent | ${status.totalAgents} |`,
      `| 完成 Agent | ${status.completedAgents} |`,
      `| 失败 Agent | ${status.failedAgents || 0} |`,
      `| 重试次数 | ${retriedAgents} |`,
      `| 耗尽放弃 | ${exhausted} |`,
      `| 团队数 | ${Object.keys(status.teams).length} |`,
      `| Token 总消耗 | ${(tokens.total_tokens / 1000).toFixed(1)}K |`,
      `| 聚合运行时间 | ${Math.round(tokens.seconds_running)}s |`,
      '',
      '## 团队详情',
      ''
    ];

    for (const [teamName, team] of Object.entries(status.teams)) {
      summaryMd.push(`### ${teamName}队`);
      summaryMd.push('');
      summaryMd.push('| Agent | 状态 | 重试 | 任务 | Token |');
      summaryMd.push('|-------|------|------|------|-------|');
      for (const [agentName, agent] of Object.entries(team.agents)) {
        const s = agent.status === 'done' ? '✅' :
          agent.status === 'failed' ? '🔴' :
          agent.status === 'exhausted' ? '💀' :
          agent.status === 'running' ? '🔄' : '⏳';
        const tokensStr = agent.tokens ? `${(agent.tokens.total_tokens / 1000).toFixed(1)}K` : '-';
        summaryMd.push(`| ${agentName} | ${s} | ${agent.attempt || 1} | ${agent.taskId} | ${tokensStr} |`);
      }
      summaryMd.push('');
    }

    if (retryEntries.length > 0) {
      summaryMd.push('## 重试记录');
      summaryMd.push('');
      summaryMd.push('| Agent | 重试次数 | 错误 |');
      summaryMd.push('|-------|---------|------|');
      retryEntries.forEach(([key, entry]) => {
        summaryMd.push(`| ${key} | ${entry.attempt}/${entry.max_attempts} | ${entry.error.slice(0, 60)} |`);
      });
      summaryMd.push('');
    }

    const summaryPath = path.join(BRIDGE_DIR, 'hammer-summary.md');
    fs.writeFileSync(summaryPath, summaryMd.join('\n'), 'utf-8');
    console.log(`[hammer-bridge] 摘要已写入: ${summaryPath}`);
    break;
  }

  // ---- init: 初始化新任务 ----
  case 'init': {
    const task = getOpt('task') || '(未命名)';
    const totalAgents = parseInt(getOpt('total-agents') || '0', 10);
    const mode = getOpt('mode') || 'oneshot';

    ensureDir();
    writeStatus({
      task,
      phase: 1,
      startedAt: new Date().toISOString(),
      teams: {},
      totalAgents,
      completedAgents: 0,
      failedAgents: 0,
      mode
    });
    // Reset retry state
    writeRetryState({ entries: {} });
    appendLog({ event: 'init', task, totalAgents, mode });

    console.log(`[hammer-bridge] 新任务已初始化: ${task} (预期 ${totalAgents} agents, 模式: ${mode})`);
    break;
  }

  // ---- prefix: 输出共享 prompt 前缀（缓存优化） ----
  case 'prefix': {
    const prefix = [
      '## 项目上下文',
      '',
      '你在 D:\\AICoding 项目中工作，这是一个 AI 编程工作台的多 Agent 竞争评审系统。',
      '项目配置见 CLAUDE.md，技能定义见 {IDE_ROOT}/skills/。',
      '',
      '## 工具与约束',
      '',
      '你可以使用 Bash、Read、Write、Edit、Grep、Glob、Agent、TaskCreate、TaskUpdate、SendMessage、WebSearch、WebFetch。',
      '遵循 lean-ctx 规则：优先使用 ctx_read/ctx_shell/ctx_search 替代原生工具以节省 token。',
      '',
      '## Lambda 通信协议',
      '',
      '与其他 agent 通信时使用 Lambda 原子协议：',
      '- 握手: @v2.0#h',
      '- 任务声明: !ta ct @task <description>',
      '- 状态更新: !ta st @status <done|blocked|running>',
      '- 产出提交: !ta out @artifact <path>',
      '- 每次通信控制在 70 token 以内',
      '',
      '## CCP 回调协议',
      '',
      '完成当前阶段后，使用回调通知协调者，不要轮询等待。',
      '如果任务涉及 <3 个文件的简单修改，直接在回调中提交结果，无需 spawn 子 agent。',
      '',
      '## 重试与容错',
      '',
      '如果当前阶段失败，MUST 记录具体错误原因。',
      '桥接层会自动计算指数退避延迟并重新调度（最多 3 次）。',
      '如果 3 次重试均失败，标记为 exhausted 并通知协调者。',
      '失活检测: 如果 5 分钟内无任何事件，该 agent 会被自动终止并重新调度。',
      '',
      '## 输出格式',
      '',
      '1. 阶段产出写入 {team}-{stage}-{name}.md 文件',
      '2. 完成后发送 Lambda 回调: !ta st @status done @artifact {team}-{stage}-{name}.md',
      '3. 如果遇到阻塞: !ta st @status blocked @reason <具体原因>',
      '4. 所有文件输出使用 UTF-8 编码，路径使用正斜杠',
    ].join('\n');
    console.log(prefix);
    break;
  }

  // ---- watch: 守护循环入口（由协调者调用，不在此脚本内做循环） ----
  case 'watch': {
    const interval = parseInt(getOpt('interval') || '30000', 10);
    const status = readStatus();
    status.mode = 'watch';
    writeStatus(status);

    console.log(JSON.stringify({
      command: 'watch-ready',
      interval_ms: interval,
      message: '协调者应在此间隔内轮询: 1) 检查 .claude-flow/hammer-queue/ 新任务; 2) 运行 retry 检查到期; 3) 运行 stall-detect; 4) 有变更则重新触发 /夯'
    }));
    break;
  }

  // ---- fix-record: 记录修复方案 ----
  case 'fix-record': {
    const fixType = getOpt('type') || '运行时异常';
    const fixSeverity = getOpt('severity') || 'P1';
    const fixSource = getOpt('source') || 'unknown';
    const fixTask = getOpt('task') || '(unnamed)';
    const fixError = getOpt('error') || '';
    const fixRootCause = getOpt('root-cause') || '';
    const fixFix = getOpt('fix') || '';
    const fixPrevention = getOpt('prevention') || '';
    const fixDate = new Date().toISOString().split('T')[0];

    if (!fs.existsSync(FIX_PROTOCOL_DIR)) {
      fs.mkdirSync(FIX_PROTOCOL_DIR, { recursive: true });
    }

    // Generate unique filename
    const fixId = `${fixDate}-${fixType.replace(/[^a-zA-Z0-9一-鿿]/g, '-').slice(0, 20)}-${Date.now().toString(36)}`;
    const fixFile = path.join(FIX_PROTOCOL_DIR, `${fixId}.md`);

    const content = [
      '---',
      `type: "${fixType}"`,
      `severity: ${fixSeverity}`,
      `source: ${fixSource}`,
      `task: "${fixTask}"`,
      `date: ${fixDate}`,
      '---',
      '',
      `# 修复记录: ${fixError.slice(0, 80)}`,
      '',
      '## 错误描述',
      '',
      fixError || '（无详细错误信息）',
      '',
      '## 根因分析',
      '',
      fixRootCause || '（未记录）',
      '',
      '## 修复方案',
      '',
      fixFix || '（未记录）',
      '',
      '## 预防措施',
      '',
      fixPrevention || '（未记录）',
      '',
    ].join('\n');

    fs.writeFileSync(fixFile, content, 'utf-8');

    // Update INDEX.md counter
    _updateFixIndex(fixType);

    appendLog({ event: 'fix-record', type: fixType, severity: fixSeverity, source: fixSource, file: fixId });
    console.log(`[hammer-bridge] Fix recorded: ${fixId} (${fixType}/${fixSeverity} from ${fixSource})`);
    console.log(`  File: ${fixFile}`);
    break;
  }

  // ---- fix-search: 按类型或关键词检索修复协议 ----
  case 'fix-search': {
    const searchType = getOpt('type') || '';
    const searchKeyword = getOpt('keyword') || '';
    const searchLimit = parseInt(getOpt('limit') || '5', 10);

    if (!fs.existsSync(FIX_PROTOCOL_DIR)) {
      console.log('[hammer-bridge] Fix protocol directory not found');
      break;
    }

    const entries = fs.readdirSync(FIX_PROTOCOL_DIR)
      .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
      .sort()
      .reverse();

    const matched = [];
    for (const entry of entries) {
      if (matched.length >= searchLimit) break;
      const filePath = path.join(FIX_PROTOCOL_DIR, entry);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const matchType = !searchType || content.includes(`type: "${searchType}"`);
        const matchKeyword = !searchKeyword || content.includes(searchKeyword);
        if (matchType && matchKeyword) {
          const titleMatch = content.match(/^# (.+)$/m);
          const typeMatch = content.match(/^type: "(.+)"$/m);
          matched.push({
            file: entry,
            title: titleMatch ? titleMatch[1] : entry,
            type: typeMatch ? typeMatch[1] : 'unknown',
            snippet: content.split('\n').slice(7, 10).join(' ').slice(0, 120),
          });
        }
      } catch (_) {}
    }

    if (matched.length === 0) {
      console.log(`[hammer-bridge] No fix protocol entries found (type="${searchType}", keyword="${searchKeyword}")`);
    } else {
      console.log(`[hammer-bridge] Found ${matched.length} fix protocol entr${matched.length > 1 ? 'ies' : 'y'}:`);
      console.log('');
      for (const m of matched) {
        console.log(`  ${m.file}`);
        console.log(`    Type: ${m.type}`);
        console.log(`    Title: ${m.title}`);
        console.log(`    ${m.snippet}...`);
        console.log('');
      }
    }
    break;
  }

  // ---- fix-list: 列出所有修复协议 ----
  case 'fix-list': {
    if (!fs.existsSync(FIX_PROTOCOL_DIR)) {
      console.log('[hammer-bridge] Fix protocol directory not found');
      break;
    }

    const entries = fs.readdirSync(FIX_PROTOCOL_DIR)
      .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
      .sort()
      .reverse();

    if (entries.length === 0) {
      console.log('[hammer-bridge] No fix protocol entries');
    } else {
      console.log(`[hammer-bridge] Fix protocol: ${entries.length} entr${entries.length > 1 ? 'ies' : 'y'}`);
      console.log('');
      // Group by type
      const byType = {};
      for (const entry of entries) {
        const filePath = path.join(FIX_PROTOCOL_DIR, entry);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const typeMatch = content.match(/^type: "(.+)"$/m);
          const sevMatch = content.match(/^severity: (.+)$/m);
          const srcMatch = content.match(/^source: (.+)$/m);
          const type = typeMatch ? typeMatch[1] : 'unknown';
          if (!byType[type]) byType[type] = [];
          byType[type].push({
            file: entry,
            severity: sevMatch ? sevMatch[1] : '?',
            source: srcMatch ? srcMatch[1] : '?',
          });
        } catch (_) {}
      }
      for (const [type, items] of Object.entries(byType)) {
        console.log(`  ${type} (${items.length}):`);
        items.forEach(i => console.log(`    [${i.severity}] ${i.file} — ${i.source}`));
      }
    }
    break;
  }

  // ---- a2a-task: Agent-to-Agent 任务提交（写入 hammer-queue）----
  case 'a2a-task': {
    const description = getOpt('description') || '(无描述)';
    const fromAgent = getOpt('from-agent') || 'unknown';
    const priority = parseInt(getOpt('priority') || '1', 10);
    const mode = getOpt('mode') || 'oneshot';
    const queueDir = path.join(PROJECT_ROOT, '.claude-flow', 'hammer-queue');
    ensureDir();
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });

    const taskFile = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    const taskData = {
      task: description,
      from: fromAgent,
      priority,
      mode,
      created_at: new Date().toISOString(),
      source: 'a2a'
    };
    fs.writeFileSync(path.join(queueDir, taskFile), JSON.stringify(taskData, null, 2), 'utf-8');
    appendLog({ event: 'a2a-task', file: taskFile, from: fromAgent, priority, mode });

    console.log(JSON.stringify({
      ok: true,
      event: 'a2a-task-queued',
      file: taskFile,
      message: `任务已入队: ${description.slice(0, 80)} (来自 ${fromAgent})`
    }));
    break;
  }

  // ---- a2a-notify: Agent-to-Agent 通知（写入通知文件供协调者读取）----
  case 'a2a-notify': {
    const notifyType = getOpt('type') || 'status';
    const notifyTeam = getOpt('team') || 'unknown';
    const notifyAgent = getOpt('agent') || 'unknown';
    const notifyStatus = getOpt('status') || 'unknown';
    const notifyMessage = getOpt('message') || '';
    const notifyArtifact = getOpt('artifact') || null;
    const notifyDir = path.join(BRIDGE_DIR, 'a2a-notifications');
    if (!fs.existsSync(notifyDir)) fs.mkdirSync(notifyDir, { recursive: true });

    const notifyFile = `a2a-${notifyType}-${notifyTeam}-${notifyAgent}-${Date.now()}.json`;
    const notifyData = {
      type: notifyType,
      team: notifyTeam,
      agent: notifyAgent,
      status: notifyStatus,
      message: notifyMessage,
      artifact: notifyArtifact,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(notifyDir, notifyFile), JSON.stringify(notifyData, null, 2), 'utf-8');

    console.log(JSON.stringify({
      ok: true,
      event: 'a2a-notified',
      file: notifyFile,
      to: 'coordinator',
      message: `[${notifyTeam}/${notifyAgent}] ${notifyStatus}: ${notifyMessage.slice(0, 60)}`
    }));
    break;
  }

  default:
    console.log([
      'hammer-bridge.cjs — /夯 桥接层 v2 (Symphony-inspired)',
      '',
      '核心命令:',
      '  init        初始化新任务     --task <名> --total-agents <N> [--mode watch|oneshot]',
      '  agent-spawn 记录 Agent 启动  --team <队> --agent <名> --task-id <ID> [--session-id <ID>]',
      '  agent-done  记录 Agent 完成  --team <队> --agent <名> --output <文件> [--tokens-in N --tokens-out N]',
      '  agent-fail  记录失败+入重试  --team <队> --agent <名> --error <原因> [--max-attempts 3 --max-backoff 300000]',
      '  status      显示当前状态',
      '  summary     生成执行摘要     --task <名>',
      '  prefix      输出共享前缀（缓存优化）',
      '',
      'Symphony v2 新增:',
      '  watch       标记为守护模式    --interval <ms>',
      '  retry       查看/触发重试     [--team <队> --agent <名>]',
      '  stall-detect 失活检测        [--stall-ms 300000]',
      '  token-track  Token 聚合追踪  --tokens-in N --tokens-out N --team <队> --agent <名>',
      '  api-state    Symphony 兼容 JSON 运行时快照',
      '',
      'A2A 通知桥 (Agent-to-Agent Bridge):',
      '  a2a-task    写入任务到队列   --description <描述> --from-agent <来源> [--priority 1] [--mode watch]',
      '  a2a-notify  发送通知给协调者  --type <status|done|blocked|error> --team <队> --agent <名> --status <状态> --message <消息> [--artifact <路径>]',
      '',
      'Fix Protocol v1 (Debug Skill):',
      '  fix-record  记录修复方案   --type <错误类型> --severity P0/P1/P2 --source <来源> --task <任务> --error <描述> [--root-cause <根因> --fix <修复方案> --prevention <预防措施>]',
      '  fix-search  检索修复协议   [--type <错误类型>] [--keyword <关键词>] [--limit <数量>]',
      '  fix-list    列出所有记录',
    ].join('\n'));
}

// ============ 内部辅助 ============

function _accumulateTokens(tokensIn, tokensOut, team, agent, sessionId) {
  const tokens = readTokens();
  tokens.input_tokens += tokensIn;
  tokens.output_tokens += tokensOut;
  tokens.total_tokens += tokensIn + tokensOut;

  const key = sessionId || `${team}/${agent}`;
  if (!tokens.sessions[key]) {
    tokens.sessions[key] = { input_tokens: 0, output_tokens: 0, total_tokens: 0, team, agent };
  }
  tokens.sessions[key].input_tokens += tokensIn;
  tokens.sessions[key].output_tokens += tokensOut;
  tokens.sessions[key].total_tokens += tokensIn + tokensOut;

  // Update runtime: for running agents, add elapsed since start
  const status = readStatus();
  if (status.teams[team] && status.teams[team].agents[agent] && status.teams[team].agents[agent].status === 'running') {
    const startedAt = new Date(status.teams[team].agents[agent].startedAt).getTime();
    tokens.seconds_running += (Date.now() - startedAt) / 1000;
  }

  writeTokens(tokens);
}

function _countStalled(status) {
  const stallMs = 300000;
  const now = Date.now();
  let count = 0;

  for (const team of Object.values(status.teams)) {
    for (const agent of Object.values(team.agents)) {
      if (agent.status !== 'running') continue;
      const lastEventTime = agent.completedAt
        ? new Date(agent.completedAt).getTime()
        : new Date(agent.startedAt).getTime();
      if (now - lastEventTime > stallMs) count++;
    }
  }
  return count;
}

function _updateFixIndex(type) {
  if (!fs.existsSync(FIX_INDEX_FILE)) return;
  try {
    const content = fs.readFileSync(FIX_INDEX_FILE, 'utf-8');
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      // Match table rows like: | 编译错误 | 0 | — |
      if (l.startsWith('| ') && l.includes(`| ${type} |`)) {
        const parts = l.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          const count = parseInt(parts[2]) || 0;
          parts[2] = String(count + 1);
          parts[3] = new Date().toISOString().split('T')[0];
          lines[i] = '| ' + parts.slice(1).join(' | ') + ' |';
          found = true;
        }
        break;
      }
    }
    if (found) {
      fs.writeFileSync(FIX_INDEX_FILE, lines.join('\n'), 'utf-8');
    }
  } catch (_) {}
}

