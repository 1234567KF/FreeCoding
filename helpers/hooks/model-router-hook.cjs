#!/usr/bin/env node
/**
 * kf-model-router Hook — Skill 模型路由（通用 IDE 手动触发版）
 *
 * EXTENDED: Multi-vendor model routing with backward compatibility.
 * ENHANCED: Integrated key-isolator + rate-limiter.
 *
 * 【通用 IDE 适配说明】
 * 原 Claude Code 版作为 PreToolUse hook 自动拦截每次工具调用，
 * 本版改为手动调用：在需要路由时执行命令获取模型建议。
 * 通用 IDE 无自动 hook 机制，路由建议输出到控制台供用户参考。
 *
 * Flow:
 *  1. Parse SKILL.md frontmatter (original logic)
 *  2. If enhanced routing available (model-registry.json exists):
 *     a. Load registry → get model pool
 *     b. Check health → filter unhealthy models
 *     c. Classify task → assign best model
 *     d. (NEW) Check rate limits via rate-limiter
 *     e. (NEW) Log key isolation status
 *     f. Output routing instruction
 *  3. Fallback to original pro/flash routing (backward compat)
 *
 * Usage:
 *   node {IDE_ROOT}/helpers/model-router-hook.cjs [--skill <name>]
 *   （通用 IDE 下手动执行，非自动 hook）
 */

const fs = require("fs");
const path = require("path");

const SKILLS_DIR = path.resolve(__dirname, "..", "..", "skills");

// Lazy-loaded enhanced modules (null if not available)
let _registryModule = null;
let _dispatcherModule = null;
let _healthModule = null;
let _keyIsolatorModule = null;
let _rateLimiterModule = null;

function getEnhancedModules() {
  if (_registryModule !== null) return true; // Already tried

  const registryPath = path.resolve(__dirname, "..", "model-provider-registry.cjs");
  const dispatcherPath = path.resolve(__dirname, "..", "smart-dispatcher.cjs");
  const healthPath = path.resolve(__dirname, "..", "model-health.cjs");
  const keyIsolatorPath = path.resolve(__dirname, "..", "key-isolator.cjs");
  const rateLimiterPath = path.resolve(__dirname, "..", "rate-limiter.cjs");

  try {
    if (fs.existsSync(registryPath) && fs.existsSync(dispatcherPath) && fs.existsSync(healthPath)) {
      _registryModule = require(registryPath);
      _dispatcherModule = require(dispatcherPath);
      _healthModule = require(healthPath);

      // Optional: key-isolator and rate-limiter
      if (fs.existsSync(keyIsolatorPath)) {
        _keyIsolatorModule = require(keyIsolatorPath);
      }
      if (fs.existsSync(rateLimiterPath)) {
        _rateLimiterModule = require(rateLimiterPath);
      }
      return true;
    }
  } catch (e) {
    console.error(`[model-router] Enhanced modules load failed: ${e.message}`);
  }

  _registryModule = false;
  return false;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};
  let meta = {};
  let inMeta = false;
  let currentListKey = null;
  let currentList = [];

  for (const line of yaml.split("\n")) {
    const metaKeyMatch = line.match(/^metadata:\s*$/);
    if (metaKeyMatch) { inMeta = true; continue; }

    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch && !line.startsWith(" ")) {
      if (currentListKey && currentList.length > 0) {
        if (inMeta) meta[currentListKey] = currentList.join(", ");
        else result[currentListKey] = currentList.join(", ");
      }
      currentListKey = null;
      currentList = [];
      inMeta = false;
      const key = kvMatch[1];
      const val = kvMatch[2].trim();
      result[key] = val || "";
      continue;
    }

    const metaKvMatch = line.match(/^\s{2}(\w[\w-]*):\s*(.*)/);
    if (metaKvMatch && inMeta) {
      if (currentListKey && currentList.length > 0) {
        meta[currentListKey] = currentList.join(", ");
      }
      currentListKey = null;
      currentList = [];
      const key = metaKvMatch[1];
      const val = metaKvMatch[2].trim();
      meta[key] = val || "";
      if (!val) currentListKey = key;
      continue;
    }

    const listMatch = line.match(/^\s{4}-\s+(.+)/);
    if (listMatch && currentListKey) {
      currentList.push(listMatch[1].replace(/['"]/g, ""));
    }
  }

  if (currentListKey && currentList.length > 0) {
    if (inMeta) meta[currentListKey] = currentList.join(", ");
    else result[currentListKey] = currentList.join(", ");
  }

  result.metadata = meta;
  return result;
}

function findSkillMd(skillName) {
  // 直接路径: skills/<name>/SKILL.md
  const dir = path.join(SKILLS_DIR, skillName);
  const mdPath = path.join(dir, "SKILL.md");
  if (fs.existsSync(mdPath)) return mdPath;

  // 嵌套路径: skills/<name>/<name>/SKILL.md（本仓库结构）
  const nestedPath = path.join(dir, skillName, "SKILL.md");
  if (fs.existsSync(nestedPath)) return nestedPath;

  return null;
}

function getSkillName() {
  // 1. 命令行参数
  const idx = process.argv.indexOf("--skill");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];

  // 2. 环境变量（Claude Code 格式）
  const env = process.env.CLAUDE_TOOL_USE_REQUEST ||
              process.env.CLAUDE_EXTRA_CONTEXT;
  if (env) {
    try {
      const p = JSON.parse(env);
      const s = p?.skill || p?.args?.skill || p?.arguments?.skill;
      if (s) return s;
    } catch {}
  }

  // 3. stdin（Qoder PreToolUse hook 格式 or Claude Code 格式）
  try {
    const buf = fs.readFileSync(0, "utf-8").trim();
    if (buf) {
      const p = JSON.parse(buf);
      // Qoder format: { tool_name: "Skill", tool_input: { skill: "kf-xxx" } }
      if (p?.tool_input?.skill) return p.tool_input.skill;
      // Claude Code format: { skill: "kf-xxx" } or { args: { skill: "kf-xxx" } }
      return p?.skill || p?.args?.skill || null;
    }
  } catch {}
  return null;
}

/**
 * Original routing logic (pure pro/flash based on frontmatter).
 * Returns instruction string or null (no routing needed).
 */
function originalRoute(skillName, fm) {
  const meta = fm.metadata || {};
  const integrated = (meta["integrated-skills"] || fm["integrated-skills"] || "");
  const recommended = (meta["recommended_model"] || fm["recommended_model"] || "");
  const hasModelRouter = integrated.includes("kf-model-router");

  if (!recommended && !hasModelRouter) return null;

  if (recommended) {
    return `[model-router] 技能 "${skillName}" 推荐模型: ${recommended}。请确保当前对话使用 ${recommended} 以获得最佳效果（计划/设计阶段），执行阶段可切换回 flash。`;
  }
  return `[model-router] 技能 "${skillName}" 已集成模型路由，请按 SKILL.md 的阶段模型分配执行。`;
}

/**
 * Enhanced multi-vendor routing.
 * Returns instruction string or null (fallback to original).
 */
async function enhancedRoute(skillName, fm) {
  if (!getEnhancedModules()) return null;

  const meta = fm.metadata || {};
  const recommended = (meta["recommended_model"] || fm["recommended_model"] || "");

  // Build task description from skill name + frontmatter hints
  const taskDesc = recommended
    ? `${skillName} ${recommended}`
    : skillName;

  try {
    // Get all available models
    const allModels = _registryModule.getAllModels();
    if (allModels.length === 0) return null;

    // Get all providers to check which API keys are configured
    const providers = _registryModule.getAllProviders();
    const configuredProviders = providers.filter((p) => process.env[p.envKey]);

    // If only DeepSeek is configured, no need for multi-vendor routing
    const hasMultiVendor = configuredProviders.length > 1 ||
      (configuredProviders.length === 1 && configuredProviders[0].id !== "deepseek");

    // (NEW) Log key isolation status if available
    if (_keyIsolatorModule && hasMultiVendor) {
      const vendorStatus = _keyIsolatorModule.listVendorStatus();
      const availableVendors = Object.entries(vendorStatus)
        .filter(([, s]) => s.available)
        .map(([id]) => id);
      if (availableVendors.length > 0) {
        console.error(
          `[model-router] key-isolator: 可用供应商 [${availableVendors.join(", ")}]`
        );
      }
    }

    // (NEW) Check rate limits for non-DeepSeek providers before routing
    if (_rateLimiterModule && hasMultiVendor) {
      for (const provider of configuredProviders) {
        if (provider.id === "deepseek") continue;
        const allowed = _rateLimiterModule.tryConsume(provider.id);
        if (!allowed) {
          console.error(
            `[model-router] rate-limiter: ${provider.id} 令牌不足，将降级路由`
          );
        }
      }
    }

    if (!hasMultiVendor) {
      // Fallback to compat-only routing (pro/flash alias)
      const compatAssignment = _dispatcherModule.assignModel(taskDesc, {
        deepseekOnly: true,
      });
      const instruction = _dispatcherModule.formatRoutingInstruction(
        compatAssignment,
        skillName
      );
      console.error(
        `[model-router] skill=${skillName} multi-vendor=disabled (only DeepSeek configured) ` +
        `taskType=${compatAssignment.taskType} model=${compatAssignment.modelId}`
      );
      return instruction;
    }

    // Multi-vendor: check health of non-DeepSeek models
    const nonDeepseekModels = allModels.filter((m) => m.providerId !== "deepseek");
    const healthyNonDeepseek = await _healthModule.filterHealthy(nonDeepseekModels);
    const unhealthyIds = nonDeepseekModels
      .filter((m) => !healthyNonDeepseek.find((h) => h.id === m.id))
      .map((m) => m.id);

    // Assign best model
    const assignment = _dispatcherModule.assignModel(taskDesc, {
      excludeModels: unhealthyIds,
    });

    // (NEW) Log adapter status if loaded
    if (assignment.adapter) {
      console.error(
        `[model-router] adapter: 已加载 ${assignment.providerId} 适配器`
      );
    }

    const instruction = _dispatcherModule.formatRoutingInstruction(assignment, skillName);
    console.error(
      `[model-router] skill=${skillName} multi-vendor=enabled ` +
      `taskType=${assignment.taskType} model=${assignment.modelId} ` +
      `provider=${assignment.providerName} fallback=${assignment.isFallback} ` +
      `complexity=${(assignment.complexity || {}).complexity || "unknown"}`
    );

    return instruction;
  } catch (err) {
    console.error(`[model-router] Enhanced routing error: ${err.message}`);
    return null; // Fallback to original
  }
}

async function main() {
  const skillName = getSkillName();
  if (!skillName) process.exit(0);

  const mdPath = findSkillMd(skillName);
  if (!mdPath) {
    console.error(`[model-router] SKILL.md not found for: ${skillName}`);
    process.exit(0);
  }

  const content = fs.readFileSync(mdPath, "utf-8");
  const fm = parseFrontmatter(content);

  // Try enhanced routing first (if registry + modules exist)
  const enhancedInstruction = await enhancedRoute(skillName, fm);
  if (enhancedInstruction) {
    console.log(enhancedInstruction);
    return;
  }

  // Fallback: original routing logic
  const originalInstruction = originalRoute(skillName, fm);
  if (originalInstruction) {
    console.log(originalInstruction);
  }
}

main().catch((err) => {
  console.error(`[model-router] Fatal error: ${err.message}`);
  process.exit(1);
});

