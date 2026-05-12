#!/usr/bin/env node
/**
 * hang-state-manager.cjs — 夯执行状态持久化管理器（通用 IDE 串行适配版）
 *
 * 实现 P0.6 深度选择 + P0.7 进展看板。
 * 管理 .claude-flow/hang-state.json 的生命周期。
 *
 * 【通用 IDE 适配说明】
 * 原 Claude Code 版配合真并发 Agent 使用，本版适配串行模式：
 * - 状态文件仍按红/蓝/绿三队结构记录，但三队串行依次执行
 * - 看板显示当前执行中的队 + 已完成队的状态
 * - 中断恢复支持串行断点续传（从当前队当前 Stage 继续）
 * - handoff.md 生成逻辑不变，仍用于跨会话恢复
 *
 * 用法:
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --init "任务名" --depth C
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --phase stage-1 --stage coding
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --team-progress red stage-2 70
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --artifact alignment docs/red-00-alignment.md
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --dashboard
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --recovery
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --status
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --complete
 *   node {IDE_ROOT}/helpers/hang-state-manager.cjs --handoff
 *
 * API:
 *   const hang = require('./hang-state-manager.cjs');
 *   hang.init(taskName, depth) → state
 *   hang.dashboard() → string
 *   hang.recoveryOptions() → { needed, board }
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(ROOT, '.claude-flow', 'hang-state.json');
const HANDOFF_FILE = path.join(ROOT, '.claude-flow', 'hang-handoff.md');

const VALID_DEPTHS = ['A', 'B', 'C'];
const DEPTH_LABELS = { A: '需求分析+方案评审', B: '需求+设计', C: '全流程编码交付' };
const DEPTH_STAGES = {
  A: ['alignment', 'planning', 'done'],
  B: ['alignment', 'architecture', 'done'],
  C: ['alignment', 'architecture', 'coding', 'testing', 'review', 'done'],
};

const PHASE_LABELS = {
  alignment: '需求对齐',
  architecture: '架构设计',
  coding: '编码',
  testing: '测试',
  review: '审查',
  done: '完成',
};

// ─── Ensure directory ───
function ensureDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Read current state ───
function getState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Write state ───
function writeState(state) {
  ensureDir();
  state.last_updated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

// ─── Init new hang session ───
function init(taskName, depth) {
  if (!VALID_DEPTHS.includes(depth)) {
    return { ok: false, error: `无效深度: ${depth}。有效值: ${VALID_DEPTHS.join(', ')}` };
  }

  const state = {
    depth,
    depth_label: DEPTH_LABELS[depth],
    task_name: taskName,
    current_phase: 'alignment',
    current_stage: 'stage_0',
    completed_phases: [],
    phases: DEPTH_STAGES[depth],
    team_progress: {
      red: { stage: 'stage_0', percent: 0 },
      blue: { stage: 'stage_0', percent: 0 },
      green: { stage: 'stage_0', percent: 0 },
    },
    artifacts: {},
    show_dashboard: true,
    execution_mode: 'serial', // 'serial' | 'concurrent' (Qoder)
    ide: null,                // 'qoder' / 'cursor' / 'trae' / ...
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  writeState(state);
  return { ok: true, state };
}

// ─── Update current phase ───
function updatePhase(phase, stage) {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };

  // Mark previous phase as completed if different
  if (phase !== state.current_phase && state.current_phase) {
    if (!state.completed_phases.includes(state.current_phase)) {
      state.completed_phases.push(state.current_phase);
    }
  }

  state.current_phase = phase;
  if (stage) state.current_stage = stage;
  writeState(state);
  return { ok: true, state };
}

// ─── Update team progress ───
function updateTeamProgress(team, stage, percent) {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };
  if (!['red', 'blue', 'green'].includes(team)) {
    return { ok: false, error: `无效队伍: ${team}。有效值: red, blue, green` };
  }

  state.team_progress[team] = { stage: stage || state.team_progress[team].stage, percent };
  writeState(state);
  return { ok: true, state };
}

// ─── Add artifact reference ───
function addArtifact(key, filePath) {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };

  state.artifacts[key] = filePath;
  writeState(state);
  return { ok: true, state };
}

// ─── Set dashboard visibility ───
function setDashboard(show) {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };

  state.show_dashboard = show;
  writeState(state);
  return { ok: true, state };
}

// ─── Mark session complete ───
function complete() {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session.' };

  state.current_phase = 'done';
  state.current_stage = 'done';
  if (!state.completed_phases.includes(state.current_phase)) {
    state.completed_phases.push(state.current_phase);
  }
  state.completed_at = new Date().toISOString();
  writeState(state);
  return { ok: true, state };
}

// ─── Sync progress from hammer-bridge state ───
function syncFromHammer() {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };

  const hammerStatusFile = path.join(ROOT, '.claude-flow', 'hammer-state', '.hammer-status.json');
  if (!fs.existsSync(hammerStatusFile)) {
    return { ok: false, error: 'No hammer-bridge state found. Start Phase 2 first.' };
  }

  try {
    const hammer = JSON.parse(fs.readFileSync(hammerStatusFile, 'utf8'));

    // Calculate team progress from completed/failed lists
    const completedByTeam = {};
    const failedByTeam = {};
    const totalByTeam = {};
    const teams = ['red', 'blue', 'green'];

    for (const team of teams) {
      completedByTeam[team] = 0;
      failedByTeam[team] = 0;
      totalByTeam[team] = 0;
    }

    // Count completed agents by team
    if (hammer.completed) {
      for (const agent of hammer.completed) {
        const team = agent.team;
        if (teams.includes(team)) completedByTeam[team]++;
      }
    }

    // Count failed agents by team
    if (hammer.failed) {
      for (const agent of hammer.failed) {
        const team = agent.team;
        if (teams.includes(team)) failedByTeam[team]++;
      }
    }

    // Count total agents for each team
    // Auto-infer total from batches or use completed+failed+running
    const allAgents = [
      ...(hammer.completed || []),
      ...(hammer.failed || []),
      ...(hammer.running_agents || []).map(id => {
        const parts = id.split('/');
        return { team: parts[0] || 'unknown' };
      })
    ];
    for (const agent of allAgents) {
      const team = agent.team;
      if (teams.includes(team)) totalByTeam[team]++;
    }

    // Fallback: if no agent-level counts, use total_agents equally distributed
    const hasAgentData = Object.values(totalByTeam).some(v => v > 0);
    if (!hasAgentData && hammer.total_agents) {
      const perTeam = Math.ceil(hammer.total_agents / 3);
      for (const team of teams) totalByTeam[team] = perTeam;
    }

    for (const team of teams) {
      const total = totalByTeam[team] || 1;
      const done = completedByTeam[team] || 0;
      const failed = failedByTeam[team] || 0;

      let percent = Math.round(((done * 100) + (failed * 50)) / total);

      state.team_progress[team] = {
        stage: state.current_stage || 'stage_0',
        percent: Math.min(100, Math.max(0, percent))
      };
    }

    // Update session-level stats
    if (hammer.completed_agents !== undefined) {
      state.completed_agents = hammer.completed_agents;
    }
    if (hammer.failed_agents !== undefined) {
      state.failed_agents = hammer.failed_agents;
    }
    if (hammer.total_agents !== undefined) {
      state.total_agents = hammer.total_agents;
    }
    state.session_id = hammer.session_id || state.session_id;

    writeState(state);
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: `Failed to sync hammer state: ${err.message}` };
  }
}

// ─── Sync from hammer and force display ───
function syncAndShow() {
  const syncResult = syncFromHammer();
  const board = dashboard();
  return { sync: syncResult, board };
}

// ─── Check if recovery is needed ───
function isRecoveryNeeded() {
  const state = getState();
  if (!state) return false;
  if (state.current_phase === 'done' || state.current_stage === 'done') return false;
  return true;
}

// ─── Get session context stats ───
function getContextStats() {
  // Try multiple possible paths for session-cost.json
  const possiblePaths = [
    path.join(ROOT, '监测者', 'monitor', '.claude', 'session-cost.json'),
    path.join(ROOT, '.claude', 'session-cost.json'),
  ];

  let sessionData = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        sessionData = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch { /* try next */ }
    }
  }

  if (!sessionData) return null;

  const inputTokens = sessionData.input_tokens || 0;
  const outputTokens = sessionData.output_tokens || 0;
  const cacheRead = sessionData.cache_read_tokens || 0;
  const apiCalls = sessionData.api_calls || 0;

  // Compute derived stats
  const totalTokens = inputTokens + outputTokens;
  const cacheHitRate = (inputTokens + cacheRead) > 0
    ? Math.round((cacheRead / (inputTokens + cacheRead)) * 100)
    : 0;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read: cacheRead,
    cache_hit_rate: cacheHitRate,
    api_calls: apiCalls,
    total_tokens: totalTokens,
    model: sessionData.model || 'unknown',
  };
}

// ─── Progress bar (ASCII) ───
function progressBar(percent, width) {
  const w = width || 16;
  const filled = Math.round((percent / 100) * w);
  const empty = w - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
}

// ─── Generate progress dashboard ───
// ─── Set execution mode (serial | concurrent) ───
function setConcurrentMode(ide) {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };
  state.execution_mode = 'concurrent';
  state.ide = ide || state.ide || 'qoder';
  writeState(state);
  return { ok: true, state };
}

function setSerialMode() {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session. Run --init first.' };
  state.execution_mode = 'serial';
  writeState(state);
  return { ok: true, state };
}

// ─── Generate concurrent side-by-side dashboard ───
function concurrentDashboard() {
  const state = getState();
  if (!state) return '⚠️ 无活跃的夯会话。请先触发 /夯 [任务]。';

  const lines = [];
  const W = 72;
  const COL_W = 20; // 每列宽度

  lines.push(`┌${'─'.repeat(W - 2)}┐`);
  const title = state.execution_mode === 'concurrent'
    ? `夯 Qoder 并发看板 (3路并行)`
    : `夯 并排看板`;
  lines.push(`│  ${title.padEnd(W - 4)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  const taskLine = `  任务: ${(state.task_name || '未命名').substring(0, W - 10)}`;
  lines.push(`│${taskLine.padEnd(W - 2)}│`);

  const modeLabel = state.execution_mode === 'concurrent' ? '并发' : '串行';
  const ideLabel = state.ide ? ` @ ${state.ide}` : '';
  const depthLine = `  深度: ${state.depth} (${state.depth_label || ''})    模式: ${modeLabel}${ideLabel}`;
  lines.push(`│${depthLine.padEnd(W - 2)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  // 并排题头
  const header = `    红队              蓝队              绿队`;
  lines.push(`│${header.padEnd(W - 2)}│`);

  // 进度条并排
  const teams = ['red', 'blue', 'green'];
  const progress = state.team_progress || {};
  const bars = teams.map(t => {
    const p = progress[t] || { percent: 0, stage: 'stage_0' };
    return { bar: progressBar(p.percent || 0, 12), pct: p.percent || 0, stage: p.stage || 'stage_0' };
  });
  const barLine = `    ${bars[0].bar} ${String(bars[0].pct).padStart(3)}%  ${bars[1].bar} ${String(bars[1].pct).padStart(3)}%  ${bars[2].bar} ${String(bars[2].pct).padStart(3)}%`;
  lines.push(`│${barLine.padEnd(W - 2)}│`);
  const stageLine = `    ${bars[0].stage.padEnd(15)} ${bars[1].stage.padEnd(15)} ${bars[2].stage.padEnd(15)}`;
  lines.push(`│${stageLine.padEnd(W - 2)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  // 各阶段各队状态 (stage 0-5)
  const STAGE_ICONS = { done: '✅', running: '🔄', pending: '⏳' };
  const stages = ['stage_0', 'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5'];
  lines.push(`│  各队阶段进度:${' '.repeat(W - 15)}│`);
  for (const s of stages) {
    const marks = teams.map(t => {
      const p = progress[t] || {};
      const curIdx = stages.indexOf(p.stage || 'stage_0');
      const thisIdx = stages.indexOf(s);
      if (thisIdx < curIdx) return STAGE_ICONS.done;
      if (thisIdx === curIdx) return (p.percent || 0) >= 100 ? STAGE_ICONS.done : STAGE_ICONS.running;
      return STAGE_ICONS.pending;
    });
    const sLabel = s.replace('stage_', 'S');
    const line = `    ${sLabel}  ${marks[0]}              ${marks[1]}              ${marks[2]}`;
    lines.push(`│${line.padEnd(W - 2)}│`);
  }
  lines.push(`│${' '.repeat(W - 2)}│`);

  // 产物概览
  const artifacts = Object.entries(state.artifacts || {});
  if (artifacts.length > 0) {
    const redN = artifacts.filter(([k]) => k.startsWith('red')).length;
    const blueN = artifacts.filter(([k]) => k.startsWith('blue')).length;
    const greenN = artifacts.filter(([k]) => k.startsWith('green')).length;
    const artLine = `  产物: 红${redN} | 蓝${blueN} | 绿${greenN}  共 ${artifacts.length} 个`;
    lines.push(`│${artLine.padEnd(W - 2)}│`);
    lines.push(`│${' '.repeat(W - 2)}│`);
  }

  lines.push(`│  输入 status 刷新 │ concurrent-status JSON 输出${' '.repeat(8)}│`);
  lines.push(`└${'─'.repeat(W - 2)}┘`);

  return lines.join('\n');
}

function dashboard() {
  const state = getState();
  if (!state) return '⚠️ 无活跃的夯会话。请先触发 /夯 [任务]。';

  const lines = [];
  const W = 58;

  lines.push(`┌$ {'─'.repeat(W - 2)} ┐`);
  lines.push(`│  ${'夯 执行看板'.padEnd(W - 4)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  const taskLine = `  任务: ${state.task_name || '未命名'}`;
  lines.push(`│${taskLine.padEnd(W - 2)}│`);

  const depthLine = `  深度: ${state.depth} (${state.depth_label || ''})    状态: ${state.current_phase === 'done' ? '已完成' : '执行中'}`;
  lines.push(`│${depthLine.padEnd(W - 2)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  // Stage chain
  const phases = state.phases || DEPTH_STAGES[state.depth] || [];
  const chainParts = [];
  for (const p of phases) {
    const label = PHASE_LABELS[p] || p;
    if (state.completed_phases.includes(p) || p === 'done') {
      chainParts.push(`[${label} ✅]`);
    } else if (p === state.current_phase) {
      chainParts.push(`[${label} 🔄]`);
    } else {
      chainParts.push(`[${label} ⏳]`);
    }
  }
  const chainLine = `  ${chainParts.join(' → ')}`;
  lines.push(`│${chainLine.padEnd(W - 2)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  // Team progress
  lines.push(`│  各队进度:`.padEnd(W - 2) + `│`);
  for (const [team, progress] of Object.entries(state.team_progress || {})) {
    const teamName = team === 'red' ? '红队' : team === 'blue' ? '蓝队' : '绿队';
    const bar = progressBar(progress.percent || 0, 14);
    const line = `    ${teamName} ${bar} ${progress.stage || ''}`;
    lines.push(`│${line.padEnd(W - 2)}│`);
  }
  lines.push(`│${' '.repeat(W - 2)}│`);

  // Session context stats
  const ctx = getContextStats();
  if (ctx) {
    const limit = state.context_limit || 200000;
    const usedPct = Math.min(100, Math.round((ctx.input_tokens / limit) * 100));
    const ctxBar = progressBar(usedPct, 12);
    const ctxLine = `  Context: ${ctxBar} (${(ctx.input_tokens / 1000).toFixed(0)}K/${(limit / 1000).toFixed(0)}K)`;
    lines.push(`│${ctxLine.padEnd(W - 2)}│`);

    const cacheStr = `  Cache: ${(ctx.cache_read / 1000000).toFixed(1)}M hits  ${ctx.cache_hit_rate}%  ${ctx.api_calls}calls`;
    lines.push(`│${cacheStr.padEnd(W - 2)}│`);
    lines.push(`│${' '.repeat(W - 2)}│`);
  }

  // Artifacts
  const artifacts = Object.entries(state.artifacts || {});
  if (artifacts.length > 0) {
    lines.push(`│  阶段产物:`.padEnd(W - 2) + `│`);
    const shown = artifacts.slice(-5); // last 5
    for (const [key, filePath] of shown) {
      const fp = typeof filePath === 'string' ? filePath : '';
      const line = `    • ${key}: ${fp}`;
      const truncated = line.length > W - 4 ? line.substring(0, W - 7) + '…' : line;
      lines.push(`│${truncated.padEnd(W - 2)}│`);
    }
    if (artifacts.length > 5) {
      lines.push(`│    ... 共 ${artifacts.length} 个产物`);
    }
  }

  lines.push(`│${' '.repeat(W - 2)}│`);
  lines.push(`│  输入 fast 跳过看板 │ status 刷新 │ compress 压缩  │`);
  lines.push(`│  stop 暂停                                      │`);
  lines.push(`└${'─'.repeat(W - 2)} ┘`);

  return lines.join('\n');
}

// ─── Generate recovery options board ───
function recoveryOptions() {
  const state = getState();
  if (!state || !isRecoveryNeeded()) {
    return { needed: false, board: null, state };
  }

  const lines = [];
  const W = 58;

  lines.push(`┌${'─'.repeat(W - 2)} ┐`);
  lines.push(`│  ${'夯 恢复检测'.padEnd(W - 4)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);
  lines.push(`│  检测到上次任务「${(state.task_name || '').substring(0, 30)}」停在「${PHASE_LABELS[state.current_phase] || state.current_phase}」阶段`.padEnd(W - 2) + `│`);
  lines.push(`│${' '.repeat(W - 2)}│`);
  lines.push(`│  你要怎么继续？`);
  lines.push(`│    A. 继续对话（不调用技能，自然推进）`);
  lines.push(`│    B. 用 gspowers 引导我（分步导航模式）`);
  lines.push(`│    C. 用夯启动编码 Pipeline（多 Agent 并发）`);
  lines.push(`│${' '.repeat(W - 2)}│`);
  lines.push(`│  请回复 A/B/C`);
  lines.push(`└${'─'.repeat(W - 2)} ┘`);

  return { needed: true, board: lines.join('\n'), state };
}

// ─── Generate handoff for gspowers ───
function generateHandoff() {
  const state = getState();
  if (!state) return { ok: false, error: 'No active hang session.' };

  const lines = [
    '# 夯执行交接文件',
    '',
    `> 生成时间: ${new Date().toISOString()}`,
    `> 任务: ${state.task_name}`,
    `> 深度: ${state.depth} (${state.depth_label})`,
    '',
    '## 任务规格',
    state.task_name || '(未记录)',
    '',
    '## 已完成阶段',
    ...(state.completed_phases || []).map(p => `- [x] ${PHASE_LABELS[p] || p}`),
    '',
    '## 当前阶段',
    `- [ ] **${PHASE_LABELS[state.current_phase] || state.current_phase}** (进行中)`,
    '',
    '## 各队进度',
  ];

  for (const [team, progress] of Object.entries(state.team_progress || {})) {
    const teamName = team === 'red' ? '红队' : team === 'blue' ? '蓝队' : '绿队';
    lines.push(`- ${teamName}: ${progress.stage || '?'} (${progress.percent || 0}%)`);
  }

  lines.push('');
  lines.push('## 产物清单');
  for (const [key, filePath] of Object.entries(state.artifacts || {})) {
    lines.push(`- ${key}: \`${filePath}\``);
  }
  if (Object.keys(state.artifacts || {}).length === 0) {
    lines.push('(暂无产物)');
  }

  lines.push('');
  lines.push('## 恢复指南');
  lines.push('1. 执行 `/gspowers` 进入导航模式');
  lines.push('2. 基于上述已完成的阶段，从当前阶段继续');

  ensureDir();
  fs.writeFileSync(HANDOFF_FILE, lines.join('\n'), 'utf8');

  return { ok: true, path: HANDOFF_FILE };
}

// ─── Remove session ───
function remove() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  if (fs.existsSync(HANDOFF_FILE)) fs.unlinkSync(HANDOFF_FILE);
  return { ok: true };
}

// ─── CLI ───
function cli() {
  const args = process.argv.slice(2);

  if (args.includes('--sync')) {
    const result = syncFromHammer();
    console.log(JSON.stringify(result, null, 2));
    if (result.ok) console.log('\n' + dashboard());
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--sync-and-show')) {
    const result = syncAndShow();
    // Only output the dashboard (for Team Lead injection)
    console.log(syncAndShow().board);
    process.exit(0);
  }

  if (args.includes('--ctx')) {
    const ctx = getContextStats();
    if (!ctx) {
      console.log('⚠️ 无会话数据。请先开始一个夯会话。');
      process.exit(0);
    }
    const limit = 200000;
    const usedPct = Math.min(100, Math.round((ctx.input_tokens / limit) * 100));
    console.log(`Context: ${usedPct}% (${(ctx.input_tokens/1000).toFixed(0)}K/${(limit/1000).toFixed(0)}K tokens)`);
    console.log(`Cache:   ${(ctx.cache_read/1000000).toFixed(1)}M hits @ ${ctx.cache_hit_rate}%`);
    console.log(`Calls:   ${ctx.api_calls} API calls`);
    console.log(`Model:   ${ctx.model}`);
    console.log('');
    console.log(`压缩提示: 输入 compress 让 Team Lead 调用 ctx_compress 精简上下文。`);
    process.exit(0);
  }

  if (args.includes('--init')) {
    const nameIdx = args.indexOf('--init') + 1;
    const taskName = args[nameIdx] || '未命名任务';
    const depthIdx = args.indexOf('--depth');
    const depth = depthIdx !== -1 ? args[depthIdx + 1] : 'C';
    const result = init(taskName, depth);
    console.log(JSON.stringify(result, null, 2));
    if (result.ok) console.log('\n' + dashboard());
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--phase')) {
    const phaseIdx = args.indexOf('--phase') + 1;
    const phase = args[phaseIdx];
    const stageIdx = args.indexOf('--stage');
    const stage = stageIdx !== -1 ? args[stageIdx + 1] : null;
    if (!phase) { console.error('Usage: hang-state-manager.cjs --phase <phase> [--stage <stage>]'); process.exit(1); }
    const result = updatePhase(phase, stage);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--team-progress')) {
    const idx = args.indexOf('--team-progress') + 1;
    const team = args[idx];
    const stage = args[idx + 1];
    const percent = parseInt(args[idx + 2], 10);
    if (!team || isNaN(percent)) { console.error('Usage: hang-state-manager.cjs --team-progress <red|blue|green> <stage> <percent>'); process.exit(1); }
    const result = updateTeamProgress(team, stage, percent);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--artifact')) {
    const idx = args.indexOf('--artifact') + 1;
    const key = args[idx];
    const filePath = args[idx + 1];
    if (!key || !filePath) { console.error('Usage: hang-state-manager.cjs --artifact <key> <path>'); process.exit(1); }
    const result = addArtifact(key, filePath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--concurrent-dashboard') || args.includes('-c')) {
    console.log(concurrentDashboard());
    process.exit(0);
  }

  if (args.includes('--concurrent-mode')) {
    const idx = args.indexOf('--concurrent-mode') + 1;
    const ide = args[idx] && !args[idx].startsWith('-') ? args[idx] : 'qoder';
    const result = setConcurrentMode(ide);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--serial-mode')) {
    const result = setSerialMode();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--dashboard')) {
    console.log(dashboard());
    process.exit(0);
  }

  if (args.includes('--recovery')) {
    const result = recoveryOptions();
    if (result.needed && result.board) console.log(result.board);
    else console.log('✅ 无待恢复的夯会话。');
    console.log('\n' + JSON.stringify({ needed: result.needed, state: result.state }, null, 2));
    process.exit(0);
  }

  if (args.includes('--status')) {
    const state = getState();
    if (!state) { console.log('{"status":"no_active_session"}'); }
    else console.log(JSON.stringify(state, null, 2));
    process.exit(0);
  }

  if (args.includes('--complete')) {
    const result = complete();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--handoff')) {
    const result = generateHandoff();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--dashboard-off')) {
    const result = setDashboard(false);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--dashboard-on')) {
    const result = setDashboard(true);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (args.includes('--remove')) {
    const result = remove();
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: show usage
  console.log('hang-state-manager.cjs — 夯执行状态持久化管理器');
  console.log('');
  console.log('  初始化:   hang-state-manager.cjs --init "任务名" --depth C');
  console.log('  更新阶段: hang-state-manager.cjs --phase coding --stage stage_2');
  console.log('  队伍进度: hang-state-manager.cjs --team-progress red stage_2 70');
  console.log('  添加产物: hang-state-manager.cjs --artifact alignment docs/red-00-alignment.md');
  console.log('  看板:     hang-state-manager.cjs --dashboard');
  console.log('  恢复:     hang-state-manager.cjs --recovery');
  console.log('  状态:     hang-state-manager.cjs --status');
  console.log('  完成:     hang-state-manager.cjs --complete');
  console.log('  交接:     hang-state-manager.cjs --handoff');
  console.log('  并发看板: hang-state-manager.cjs --concurrent-dashboard');
  console.log('  开并发:   hang-state-manager.cjs --concurrent-mode qoder');
  console.log('  清理:     hang-state-manager.cjs --remove');
}

if (require.main === module) {
  cli();
}

module.exports = {
  init,
  updatePhase,
  updateTeamProgress,
  addArtifact,
  setDashboard,
  setConcurrentMode,
  setSerialMode,
  getState,
  isRecoveryNeeded,
  dashboard,
  concurrentDashboard,
  recoveryOptions,
  generateHandoff,
  complete,
  remove,
  syncFromHammer,
  syncAndShow,
  getContextStats,
  VALID_DEPTHS,
  DEPTH_LABELS,
  DEPTH_STAGES,
  PHASE_LABELS,
};

