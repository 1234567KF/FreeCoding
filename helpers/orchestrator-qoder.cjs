#!/usr/bin/env node
/**
 * orchestrator-qoder.cjs — 夯 Qoder 并发模式编排辅助脚本
 *
 * 纯 Node 工具（不调 LLM），由主协调者在 Qoder 上以并发模式运行 /夯 时调用。
 * 复用 hammer-bridge.cjs 和 hang-state-manager.cjs 的现有状态机，不重写。
 *
 * 与串行模式的区别：
 * - fan-out: 三队同时"登记启动"，而非顺序 spawn
 * - fan-in:  轮询三队同阶段产物全部就绪后放行下一步（反转门控 / 裁判评分）
 * - 看板:    并排显示三队实时 Stage 进度
 *
 * 用法:
 *   node helpers/orchestrator-qoder.cjs <command> [options]
 *
 * 命令:
 *   detect-ide                                  返回 qoder | cursor | windsurf | trae | claude-code | unknown
 *   fan-out --teams red,blue,green [--stage 0]  登记三队并发启动时间戳
 *   fan-in --teams red,blue,green --stage 0     轮询三队阶段产物就绪状态（一次性快照，不阻塞）
 *                                               [--wait-ms 300000] [--poll-ms 3000] 阻塞等待
 *   concurrent-status                           聚合三队当前 Stage 进度，输出并排看板
 *   ide-info                                    综合输出 IDE 信息 + 并发能力推荐
 *
 * 退出码:
 *   fan-in:  0=全部就绪 | 2=未就绪/超时 | 1=参数错误
 *   其他:    0=成功 | 1=失败
 */

const fs = require('fs');
const path = require('path');

// 项目根目录：helpers 位于 {IDE_ROOT}/helpers/
const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT, '.claude-flow', 'hammer-state');
const CONCURRENT_FILE = path.join(STATE_DIR, '.concurrent-spawn.json');
const HAMMER_STATUS_FILE = path.join(STATE_DIR, '.hammer-status.json');

const VALID_TEAMS = ['red', 'blue', 'green'];
const TEAM_LABELS = { red: '红队', blue: '蓝队', green: '绿队' };

// ─── Helpers ───
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function now() { return new Date().toISOString(); }
function sleepSync(ms) { const end = Date.now() + ms; while (Date.now() < end) {} }

// ─── IDE Detection ───
/**
 * 检测当前 IDE 类型。
 * 依据：
 *   - Qoder: 存在 .qoder/ 目录 或 AGENTS.md 提到 qoder 或 QODER_IDE 环境变量
 *   - Cursor: 存在 .cursor/ 目录 或 .cursorrules
 *   - Windsurf: 存在 .windsurf/ 或 .windsurfrules
 *   - Trae: 存在 .trae/ 目录
 *   - Claude Code: 存在 .claude/ 目录 且无其他 IDE 标记
 */
function detectIde() {
  const signals = {
    qoder: fs.existsSync(path.join(ROOT, '.qoder')),
    cursor: fs.existsSync(path.join(ROOT, '.cursor')) || fs.existsSync(path.join(ROOT, '.cursorrules')),
    windsurf: fs.existsSync(path.join(ROOT, '.windsurf')) || fs.existsSync(path.join(ROOT, '.windsurfrules')),
    trae: fs.existsSync(path.join(ROOT, '.trae')),
    claudeCode: fs.existsSync(path.join(ROOT, '.claude')),
  };

  // 环境变量优先级最高
  if (process.env.QODER_IDE || process.env.QODER) return 'qoder';
  if (process.env.CLAUDE_CODE) return 'claude-code';

  // AGENTS.md 提示（Qoder 约定）
  const agentsMd = path.join(ROOT, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    try {
      const content = fs.readFileSync(agentsMd, 'utf8').toLowerCase();
      if (content.includes('qoder')) signals.qoder = true;
    } catch { /* ignore */ }
  }

  // 目录信号
  if (signals.qoder) return 'qoder';
  if (signals.cursor) return 'cursor';
  if (signals.windsurf) return 'windsurf';
  if (signals.trae) return 'trae';
  if (signals.claudeCode) return 'claude-code';
  return 'unknown';
}

function canRunConcurrent(ide) {
  // Qoder 和 Claude Code 支持多 Agent 并发；其余只能串行
  return ide === 'qoder' || ide === 'claude-code';
}

// ─── fan-out: 登记三队并发启动 ───
function fanOut({ teams, stage }) {
  const teamList = (teams || 'red,blue,green').split(',').map(t => t.trim()).filter(Boolean);
  for (const t of teamList) {
    if (!VALID_TEAMS.includes(t)) {
      return { ok: false, error: `无效团队: ${t}，有效值: ${VALID_TEAMS.join(',')}` };
    }
  }

  const existing = readJSON(CONCURRENT_FILE, { spawns: [] });
  const entry = {
    stage: stage || '0',
    teams: teamList,
    spawned_at: now(),
    expected_artifacts: teamList.map(t => `${t}-${String(stage || '0').padStart(2, '0')}-*.md`),
  };
  existing.spawns.push(entry);
  existing.last_spawn = entry;
  writeJSON(CONCURRENT_FILE, existing);

  return { ok: true, entry };
}

// ─── fan-in: 轮询三队阶段产物就绪状态 ───
/**
 * 扫描 workspace 根目录下形如 `{team}-{NN}-*.md` 的产物文件。
 * 由于并发模式下产物文件位置由 agent prompt 约定（相对 ROOT），
 * 我们检查几个常见位置：ROOT 下、.claude-flow/hammer-artifacts/ 下。
 */
function findArtifact(team, stage) {
  const pad = String(stage).padStart(2, '0');
  const candidateDirs = [
    ROOT,
    path.join(ROOT, '.claude-flow', 'hammer-artifacts'),
    path.join(ROOT, 'docs'),
  ];
  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    let entries = [];
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (name.startsWith(`${team}-${pad}-`) && name.endsWith('.md')) {
        return path.join(dir, name);
      }
    }
  }
  return null;
}

function fanInOnce({ teams, stage }) {
  const teamList = (teams || 'red,blue,green').split(',').map(t => t.trim()).filter(Boolean);
  const pad = String(stage || '0').padStart(2, '0');

  const result = {
    ready: true,
    stage: pad,
    teams: {},
    artifacts: [],
    missing: [],
  };

  for (const t of teamList) {
    const file = findArtifact(t, stage);
    if (file) {
      result.teams[t] = { ready: true, artifact: file };
      result.artifacts.push(file);
    } else {
      result.teams[t] = { ready: false, expected: `${t}-${pad}-*.md` };
      result.missing.push(t);
      result.ready = false;
    }
  }

  return result;
}

function fanIn({ teams, stage, waitMs, pollMs }) {
  const wait = parseInt(waitMs, 10) || 0;
  const poll = parseInt(pollMs, 10) || 3000;
  const deadline = Date.now() + wait;

  let snapshot = fanInOnce({ teams, stage });
  if (snapshot.ready || wait <= 0) return snapshot;

  // 阻塞轮询直到超时或全部就绪
  while (Date.now() < deadline) {
    sleepSync(poll);
    snapshot = fanInOnce({ teams, stage });
    if (snapshot.ready) break;
  }

  snapshot.timeout = !snapshot.ready;
  return snapshot;
}

// ─── 并发看板（并排列显示三队） ───
function concurrentStatus() {
  const hammer = readJSON(HAMMER_STATUS_FILE, null);
  const concurrent = readJSON(CONCURRENT_FILE, { spawns: [] });

  const teams = { red: {}, blue: {}, green: {} };
  if (hammer && hammer.teams) {
    for (const t of VALID_TEAMS) {
      teams[t] = hammer.teams[t] || { running: 0, done: 0, failed: 0 };
    }
  }

  // 扫描各队最新已完成的 Stage（通过产物文件）
  for (const t of VALID_TEAMS) {
    let latestStage = -1;
    let latestArtifact = null;
    for (let s = 0; s <= 5; s++) {
      const f = findArtifact(t, s);
      if (f) {
        latestStage = s;
        latestArtifact = f;
      }
    }
    teams[t].latest_stage = latestStage;
    teams[t].latest_artifact = latestArtifact;
  }

  // 构造并排看板
  const lines = [];
  const W = 68;
  lines.push(`┌${'─'.repeat(W - 2)}┐`);
  lines.push(`│  ${'夯 并发执行看板 (Qoder)'.padEnd(W - 4)}│`);
  lines.push(`│${' '.repeat(W - 2)}│`);

  if (hammer && hammer.task) {
    lines.push(`│  任务: ${String(hammer.task).substring(0, W - 10).padEnd(W - 10)}│`);
  }
  lines.push(`│${' '.repeat(W - 2)}│`);

  // 阶段进度横向（Stage 0-5）
  lines.push(`│  Stage:  0    1    2    3    3.5  4    5${' '.repeat(W - 44)}│`);

  for (const t of VALID_TEAMS) {
    const latest = teams[t].latest_stage;
    const marks = [];
    // 6 个 stage 位: 0, 1, 2, 3, 3.5, 4, 5 共 7 列
    const stageKeys = [0, 1, 2, 3, 3.5, 4, 5];
    for (const sk of stageKeys) {
      if (latest === -1) marks.push('⬛');
      else if (Math.floor(sk) <= latest) marks.push('✅');
      else if (Math.floor(sk) === latest + 1) marks.push('🔄');
      else marks.push('⏳');
    }
    const line = `  ${TEAM_LABELS[t]}:  ${marks.join('   ')}`;
    // 中文字符宽度处理：简化，直接 padEnd
    lines.push(`│${line.padEnd(W - 2)}│`);
  }

  lines.push(`│${' '.repeat(W - 2)}│`);

  // 最近产物
  lines.push(`│  最新产物:${' '.repeat(W - 13)}│`);
  for (const t of VALID_TEAMS) {
    const art = teams[t].latest_artifact;
    const rel = art ? path.relative(ROOT, art).replace(/\\/g, '/') : '(无)';
    const line = `    ${TEAM_LABELS[t]}: ${rel}`;
    const truncated = line.length > W - 4 ? line.substring(0, W - 7) + '…' : line;
    lines.push(`│${truncated.padEnd(W - 2)}│`);
  }

  if (concurrent.last_spawn) {
    lines.push(`│${' '.repeat(W - 2)}│`);
    const spawn = concurrent.last_spawn;
    const spawnLine = `  上次并发: Stage ${spawn.stage} @ ${spawn.spawned_at.substring(11, 19)}`;
    lines.push(`│${spawnLine.padEnd(W - 2)}│`);
  }

  lines.push(`└${'─'.repeat(W - 2)}┘`);
  return lines.join('\n');
}

// ─── IDE 综合信息 ───
function ideInfo() {
  const ide = detectIde();
  const concurrent = canRunConcurrent(ide);
  return {
    ide,
    concurrent_capable: concurrent,
    recommended_mode: concurrent ? 'qoder-concurrent' : 'generic-serial',
    skill_branch: concurrent
      ? 'skills/kf-multi-team-compete/kf-multi-team-compete/qoder-concurrent.md'
      : 'skills/kf-multi-team-compete/kf-multi-team-compete/SKILL.md (serial path)',
  };
}

// ─── CLI ───
function cli() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('orchestrator-qoder.cjs — 夯 Qoder 并发模式编排助手');
    console.log('');
    console.log('命令:');
    console.log('  detect-ide          检测当前 IDE 类型');
    console.log('  ide-info            IDE 信息 + 并发能力 + 推荐分支');
    console.log('  fan-out             登记三队并发启动  --teams red,blue,green --stage 0');
    console.log('  fan-in              轮询三队产物就绪  --teams red,blue,green --stage 0 [--wait-ms 300000 --poll-ms 3000]');
    console.log('  concurrent-status   并排看板（三队实时进度）');
    process.exit(0);
  }

  const cmd = args[0];
  const rest = args.slice(1);

  function getopt(name, fallback) {
    const idx = rest.indexOf(name);
    if (idx === -1) return fallback;
    return rest[idx + 1] || fallback;
  }

  try {
    switch (cmd) {
      case 'detect-ide': {
        console.log(detectIde());
        process.exit(0);
      }

      case 'ide-info': {
        console.log(JSON.stringify(ideInfo(), null, 2));
        process.exit(0);
      }

      case 'fan-out': {
        const result = fanOut({
          teams: getopt('--teams', 'red,blue,green'),
          stage: getopt('--stage', '0'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ok ? 0 : 1);
      }

      case 'fan-in': {
        const result = fanIn({
          teams: getopt('--teams', 'red,blue,green'),
          stage: getopt('--stage', '0'),
          waitMs: getopt('--wait-ms', '0'),
          pollMs: getopt('--poll-ms', '3000'),
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.ready ? 0 : 2);
      }

      case 'concurrent-status': {
        console.log(concurrentStatus());
        process.exit(0);
      }

      default: {
        console.error(`未知命令: ${cmd}`);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`[orchestrator-qoder] 错误: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  cli();
}

module.exports = {
  detectIde,
  canRunConcurrent,
  ideInfo,
  fanOut,
  fanIn,
  fanInOnce,
  concurrentStatus,
  findArtifact,
  VALID_TEAMS,
  TEAM_LABELS,
};
