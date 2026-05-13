/**
 * Hammer Merge — 三队产物并集合并工具
 *
 * 冲突检测（IDENTICAL / CONTENT / UNIQUE）+ Smart Merge
 *
 * 用法：
 *   node {IDE_ROOT}/helpers/hammer-merge.cjs --pattern "<team>-<stage>-*.md" --output merged-<stage>.md
 *   node {IDE_ROOT}/helpers/hammer-merge.cjs --dirs red-05-tests blue-05-tests green-05-tests --output merged-tests/
 */

const fs = require('fs');
const path = require('path');

const CWD = process.env.CLAUDE_PROJECT_DIR || process.env.QODER_PROJECT_DIR || process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dirs: [] };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pattern': opts.pattern = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--dirs':
        while (args[i + 1] && !args[i + 1].startsWith('--')) {
          opts.dirs.push(args[++i]);
        }
        break;
      case '--strategy': opts.strategy = args[++i]; break; // prefer-red, prefer-blue, prefer-green, union
      case '--help':
        console.log('Usage: hammer-merge.cjs --pattern <glob> --output <path> [--strategy <strategy>]');
        console.log('       hammer-merge.cjs --dirs <dir1> <dir2> <dir3> --output <dir>');
        process.exit(0);
    }
  }
  return opts;
}

// ─── 冲突检测 ──────────────────────────────────────────────────────────────
function detectConflict(fileA, fileB) {
  if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) return 'UNIQUE';
  const contentA = fs.readFileSync(fileA, 'utf-8').trim();
  const contentB = fs.readFileSync(fileB, 'utf-8').trim();
  if (contentA === contentB) return 'IDENTICAL';
  return 'CONTENT';
}

// ─── 合并策略 ──────────────────────────────────────────────────────────────
function mergeFiles(files, strategy = 'union') {
  const contents = files.filter(f => fs.existsSync(f)).map(f => ({
    path: f,
    content: fs.readFileSync(f, 'utf-8'),
    team: path.basename(f).split('-')[0]
  }));

  if (contents.length === 0) return '';

  switch (strategy) {
    case 'prefer-red': return contents.find(c => c.team === 'red')?.content || contents[0].content;
    case 'prefer-blue': return contents.find(c => c.team === 'blue')?.content || contents[0].content;
    case 'prefer-green': return contents.find(c => c.team === 'green')?.content || contents[0].content;
    case 'union':
    default: {
      // 标记来源合并
      let merged = '# Merged Output\n\n';
      for (const c of contents) {
        merged += `## Source: ${path.basename(c.path)}\n\n${c.content}\n\n---\n\n`;
      }
      return merged;
    }
  }
}

// ─── 目录合并 ──────────────────────────────────────────────────────────────
function mergeDirectories(dirs, outputDir) {
  console.log(`\n=== 目录合并 → ${outputDir} ===\n`);

  // 收集所有文件名
  const allFiles = new Set();
  for (const dir of dirs) {
    const fullDir = path.resolve(CWD, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
      if (entry.isFile()) allFiles.add(entry.name);
    }
  }

  // 确保输出目录存在
  const outPath = path.resolve(CWD, outputDir);
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });

  const report = { identical: [], content: [], unique: [] };

  for (const fileName of allFiles) {
    const filePaths = dirs.map(d => path.resolve(CWD, d, fileName));
    const existingPaths = filePaths.filter(f => fs.existsSync(f));

    if (existingPaths.length === 1) {
      // UNIQUE — 仅一个队有
      const content = fs.readFileSync(existingPaths[0], 'utf-8');
      fs.writeFileSync(path.join(outPath, fileName), content);
      report.unique.push(fileName);
      console.log(`  [U] ${fileName} — 仅 ${path.basename(path.dirname(existingPaths[0]))} 有`);
    } else if (existingPaths.length >= 2) {
      // 检测冲突
      const conflict = detectConflict(existingPaths[0], existingPaths[1]);
      if (conflict === 'IDENTICAL') {
        fs.writeFileSync(path.join(outPath, fileName), fs.readFileSync(existingPaths[0], 'utf-8'));
        report.identical.push(fileName);
        console.log(`  [I] ${fileName} — 三队一致`);
      } else {
        // CONTENT 冲突 — 合并
        const merged = mergeFiles(existingPaths, 'union');
        fs.writeFileSync(path.join(outPath, fileName), merged);
        report.content.push(fileName);
        console.log(`  [C] ${fileName} — 内容冲突，已合并`);
      }
    }
  }

  console.log(`\n  合并完成: ${report.identical.length} 一致 | ${report.content.length} 冲突合并 | ${report.unique.length} 唯一\n`);

  // 保存合并报告
  const reportPath = path.join(outPath, 'merge-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

// ─── 主入口 ──────────────────────────────────────────────────────────────
const opts = parseArgs();

if (opts.dirs.length > 0 && opts.output) {
  mergeDirectories(opts.dirs, opts.output);
} else if (opts.pattern && opts.output) {
  // Glob 模式合并
  const teams = ['red', 'blue', 'green'];
  const files = teams.map(t => path.resolve(CWD, opts.pattern.replace('<team>', t)));
  const merged = mergeFiles(files, opts.strategy);
  const outPath = path.resolve(CWD, opts.output);
  fs.writeFileSync(outPath, merged);
  console.log(`\n合并完成: ${outPath}\n`);
} else {
  console.error('错误: 必须指定 --dirs + --output 或 --pattern + --output');
  process.exit(1);
}
