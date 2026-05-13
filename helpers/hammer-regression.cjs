/**
 * Hammer Regression — 一键回归流水线
 *
 * DB 重置 → 种子数据 → 测试 → 覆盖率 → 报告 → 归档
 *
 * 通用适配说明：
 * - DB 重置/种子数据为可选步骤（--with-db），默认跳过
 * - 通用框架不应假设具体业务数据库
 *
 * 用法：
 *   node {IDE_ROOT}/helpers/hammer-regression.cjs --team <red|blue|green> [--with-db] [--seed <path>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CWD = process.env.CLAUDE_PROJECT_DIR || process.env.QODER_PROJECT_DIR || process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--team': opts.team = args[++i]; break;
      case '--with-db': opts.withDb = true; break;
      case '--seed': opts.seed = args[++i]; break;
      case '--archive-dir': opts.archiveDir = args[++i]; break;
      case '--help':
        console.log('Usage: hammer-regression.cjs --team <team> [--with-db] [--seed <path>]');
        process.exit(0);
    }
  }
  return opts;
}

function step(name, fn) {
  console.log(`\n  ▶ ${name}`);
  try {
    const result = fn();
    console.log(`    ✓ ${name} 完成`);
    return result;
  } catch (e) {
    console.log(`    ✗ ${name} 失败: ${e.message}`);
    return null;
  }
}

function run() {
  const opts = parseArgs();
  if (!opts.team) {
    console.error('错误: 必须指定 --team <red|blue|green>');
    process.exit(1);
  }

  const team = opts.team;
  const archiveDir = opts.archiveDir || path.resolve(CWD, `${team}-03-regression`);

  console.log(`\n=== 回归流水线 — ${team} ===`);

  // Step 1: DB 重置（可选）
  if (opts.withDb) {
    step('DB 重置', () => {
      // 查找项目中的重置脚本
      const resetScripts = [
        path.resolve(CWD, 'scripts/db-reset.js'),
        path.resolve(CWD, 'scripts/reset-db.sh'),
        path.resolve(CWD, 'prisma/reset.ts')
      ];
      for (const script of resetScripts) {
        if (fs.existsSync(script)) {
          execSync(`node ${script}`, { cwd: CWD, timeout: 30000 });
          return `执行: ${path.basename(script)}`;
        }
      }
      return '无重置脚本，跳过';
    });

    // Step 2: 种子数据
    step('种子数据', () => {
      const seedPath = opts.seed || path.resolve(CWD, 'scripts/seed.js');
      if (fs.existsSync(seedPath)) {
        execSync(`node ${seedPath}`, { cwd: CWD, timeout: 30000 });
        return `执行: ${path.basename(seedPath)}`;
      }
      return '无种子脚本，跳过';
    });
  } else {
    console.log('\n  ▶ DB 重置/种子数据（跳过 — 使用 --with-db 启用）');
  }

  // Step 3: 运行测试
  const testResult = step('运行测试', () => {
    try {
      const output = execSync('npx vitest run 2>&1', {
        cwd: CWD,
        timeout: 180000,
        encoding: 'utf-8'
      });
      return { pass: true, output: output.slice(-500) };
    } catch (e) {
      return { pass: false, output: e.stdout?.slice(-500) || e.message };
    }
  });

  // Step 4: 覆盖率
  const coverageResult = step('采集覆盖率', () => {
    try {
      execSync('npx vitest run --coverage 2>&1', {
        cwd: CWD,
        timeout: 180000,
        encoding: 'utf-8'
      });
      return { pass: true };
    } catch (e) {
      return { pass: false };
    }
  });

  // Step 5: 生成报告
  step('生成回归报告', () => {
    const report = {
      team,
      timestamp: new Date().toISOString(),
      withDb: !!opts.withDb,
      tests: testResult,
      coverage: coverageResult
    };

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const reportPath = path.join(archiveDir, `regression-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return `报告已保存: ${reportPath}`;
  });

  console.log(`\n  === 回归流水线完成 — ${team} ===\n`);
  console.log(`  测试: ${testResult?.pass ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  覆盖率: ${coverageResult?.pass ? '✅ 已采集' : '⚠️ 未采集'}`);
  console.log('');

  return testResult?.pass ? 0 : 1;
}

process.exit(run());
