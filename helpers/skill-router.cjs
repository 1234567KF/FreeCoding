#!/usr/bin/env node
/**
 * skill-router.cjs — 技能路由表生成 + 门控验证
 *
 * 用法:
 *   node {IDE_ROOT}/helpers/skill-router.cjs --inject --stage 1 --role "前端专家"
 *   node {IDE_ROOT}/helpers/skill-router.cjs --verify --stage 1 --team red --dir ./
 *   node {IDE_ROOT}/helpers/skill-router.cjs --list --stage 1 --role "后端专家"
 */

const fs = require('fs');
const path = require('path');

const STAGE_MAP_PATH = path.resolve(__dirname, 'stage-skill-map.json');
const REGISTRY_PATH = path.resolve(__dirname, '..', 'skill-registry.json');

// ─── Cache ──────────────────────────────────────────────────────────

let _stageMap = null;
let _registry = null;

function loadStageMap() {
  if (_stageMap) return _stageMap;
  if (!fs.existsSync(STAGE_MAP_PATH)) return null;
  _stageMap = JSON.parse(fs.readFileSync(STAGE_MAP_PATH, 'utf-8'));
  return _stageMap;
}

function loadRegistry() {
  if (_registry) return _registry;
  if (!fs.existsSync(REGISTRY_PATH)) return null;
  _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  return _registry;
}

// ─── Core: get skills for a stage ─────────────────────────────────────

function getSkillsForStage({ stage, agentRole }) {
  const stageMap = loadStageMap();
  if (!stageMap) return { error: 'stage-skill-map.json not found' };

  const stageDef = stageMap.stages[String(stage)];
  if (!stageDef) return { error: `Stage ${stage} not defined` };

  const required = [...(stageDef.required || [])];
  const recommended = [...(stageDef.recommended || [])];
  const contextual = [...(stageDef.contextual || [])];
  const alwaysOn = [...(stageMap.always_on_skills?.skills || [])];
  const globalSkills = [...(stageMap.global_skills?.skills || [])];

  // Add role-specific agent skills
  const roleSkills = [];
  if (agentRole && stageDef.agent_skills) {
    for (const [role, skills] of Object.entries(stageDef.agent_skills)) {
      if (role === agentRole) {
        roleSkills.push(...skills);
      }
    }
  }

  return {
    required,
    recommended,
    contextual,
    role_skills: roleSkills,
    always_on: alwaysOn,
    global: globalSkills,
    all: [...new Set([...required, ...recommended, ...contextual, ...roleSkills, ...alwaysOn, ...globalSkills])],
  };
}

// ─── Inject: generate routing table for agent prompt ─────────────────

function generateRoutingTable({ stage, agentRole }) {
  const result = getSkillsForStage({ stage, agentRole });
  if (result.error) return `<!--\n  ⚠ ${result.error}\n-->`;

  const stageDef = loadStageMap().stages[String(stage)];
  const stageName = stageDef?.name || `Stage ${stage}`;
  const registry = loadRegistry();
  const nameMap = {};
  if (registry) {
    registry.entries.forEach(e => { nameMap[e.name] = e; });
  }

  // Build rows: [severity, name, triggers, description]
  const rows = [];

  function pushSkill(name, priority) {
    const entry = nameMap[name];
    if (!entry) {
      rows.push({ priority, name, triggers: '', desc: '' });
      return;
    }
    const triggerText = entry.triggers?.length > 0
      ? entry.triggers.slice(0, 3).join(', ')
      : '';
    const shortDesc = entry.description_short?.length > 50
      ? entry.description_short.slice(0, 47) + '...'
      : (entry.description_short || '');
    rows.push({ priority, name, triggers: triggerText, desc: shortDesc });
  }

  // Priority: P0 required, P1 recommended, then contextual, role_skills
  for (const name of (result.required || [])) pushSkill(name, '🔴 P0');
  for (const name of (result.recommended || [])) pushSkill(name, '🟡 P1');
  for (const name of (result.contextual || [])) pushSkill(name, '🟢 —');
  for (const name of (result.role_skills || [])) pushSkill(name, '🔵');

  if (rows.length === 0) return `<!-- Stage ${stage}: 无可用技能 -->`;

  // Format as markdown table
  let lines = [`## 技能路由指引 — ${stageName}`, '', '| 优先级 | 技能 | 触发词 | 用途 |', '|--------|------|--------|------|'];
  for (const r of rows) {
    const name = r.name;
    const triggers = r.triggers || '—';
    const desc = r.desc || '—';
    lines.push(`| ${r.priority} | \`${name}\` | ${triggers} | ${desc} |`);
  }
  lines.push('', '**使用**: 输出中引用技能名即可（如 "用 kf-web-search 搜索方案"）', '');

  return lines.join('\n');
}

// ─── Verify: gate check after stage completion ───────────────────────

function verifySkillUsage({ stage, team, outputDir }) {
  const result = getSkillsForStage({ stage });
  if (result.error) return { passed: false, issues: [result.error] };

  const issues = [];
  const passEntries = [];

  // Collect all output files in the directory
  let files = [];
  if (outputDir && fs.existsSync(outputDir)) {
    try {
      files = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(outputDir, f));
    } catch (e) {
      issues.push(`Cannot read output dir: ${e.message}`);
    }
  }

  if (files.length === 0) {
    issues.push('No output files found for gate verification');
  }

  // Scan output files for skill usage by P0 priority
  const allText = files.map(f => {
    try { return fs.readFileSync(f, 'utf-8'); }
    catch { return ''; }
  }).join('\n');

  const registry = loadRegistry();
  const nameMap = {};
  if (registry) {
    registry.entries.forEach(e => { nameMap[e.name] = e; });
  }

  // Check P0 skills
  for (const name of (result.required || [])) {
    const entry = nameMap[name];
    const patterns = [name, ...(entry?.triggers || [])].filter(Boolean);
    const found = patterns.some(p => allText.includes(p));
    if (found) {
      passEntries.push({ name, status: 'pass', severity: 'P0' });
    } else {
      issues.push(`P0 技能未使用: ${name} — 输出中未找到技能名或触发词`);
    }
  }

  // Check P1 recommended (warn only)
  for (const name of (result.recommended || [])) {
    const entry = nameMap[name];
    const patterns = [name, ...(entry?.triggers || [])].filter(Boolean);
    const found = patterns.some(p => allText.includes(p));
    if (found) {
      passEntries.push({ name, status: 'pass', severity: 'P1' });
    } else {
      passEntries.push({ name, status: 'warn', severity: 'P1' });
    }
  }

  return {
    passed: issues.length === 0,
    stage,
    team: team || 'unknown',
    total_files: files.length,
    required_p0: (result.required || []).length,
    recommended_p1: (result.recommended || []).length,
    checked_entries: passEntries,
    issues: issues.length > 0 ? issues : undefined,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--inject')) {
    const stageIdx = args.indexOf('--stage');
    const roleIdx = args.indexOf('--role');
    const stage = stageIdx >= 0 ? args[stageIdx + 1] : '1';
    const role = roleIdx >= 0 ? args[roleIdx + 1] : '';

    console.log(generateRoutingTable({ stage, agentRole: role }));
    return;
  }

  if (args.includes('--verify')) {
    const stage = args[args.indexOf('--stage') + 1] || '1';
    const team = args[args.indexOf('--team') + 1] || 'unknown';
    const dir = args[args.indexOf('--dir') + 1] || '.';

    const result = verifySkillUsage({ stage, team, outputDir: dir });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  }

  if (args.includes('--list')) {
    const stage = args[args.indexOf('--stage') + 1] || '1';
    const role = args[args.indexOf('--role') + 1] || '';

    const result = getSkillsForStage({ stage, agentRole: role });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Default: print usage
  console.log(`skill-router.cjs — 技能路由表生成 + 门控验证

用法:
  --inject --stage <N> --role "<角色>"     生成路由表（注入 agent prompt）
  --verify --stage <N> --team <name> --dir <path>  门控检查
  --list   --stage <N> --role "<角色>"     列出阶段可用技能

示例:
  node {IDE_ROOT}/helpers/skill-router.cjs --inject --stage 1 --role "前端专家"
  node {IDE_ROOT}/helpers/skill-router.cjs --verify --stage 1 --team red --dir ./.claude-flow/hammer-workspaces/
  node {IDE_ROOT}/helpers/skill-router.cjs --list --stage 2 --role "后端专家"`);
}

// Run if called directly
if (require.main === module) {
  main();
}

// ─── Exports ─────────────────────────────────────────────────────────

module.exports = { generateRoutingTable, verifySkillUsage, getSkillsForStage };

