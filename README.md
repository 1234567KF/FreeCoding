# FreeCoding —  AI 编程智驾框架

## 概述

 FreeCoding ，源于基于claude code的ChronoCoding 是 AI 编程智驾框架。你（AI Agent）正在阅读这份说明。

### 核心能力

| 能力 | 技能入口 | 说明 |
|------|---------|------|
| `/夯` | `kf-multi-team-compete` | 多团队竞争评审（红蓝绿三队并行/串行，含裁判+对抗+汇总） |
| `/triple` | `kf-triple-collaboration` | 红蓝评审三方协作 |
| `/align` | `kf-alignment` | 需求对齐 |
| `/spec` | `kf-spec` | 技术规格生成 |
| `/prd` | `kf-prd-generator` | PRD 文档生成 |
| `/review` | `kf-code-review-graph` | 代码审查 + 依赖图谱 |
| `/search` | `kf-web-search` | 智能 Web 搜索 |
| `/image` | `kf-image-editor` | AI 图片编辑 |

## 安装流程（AI 自动执行）

> **给你的指令**：检测当前运行环境，执行对应 IDE 的安装。用户把本 README 发给你就是让你做这件事。如果遇到 API Key 缺失，主动询问用户提供。

### Step 1 — 检测 IDE 环境

执行以下命令检测当前运行的是哪个 IDE：

```bash
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs detect-ide
```

返回 `qoder` / `cursor` / `windsurf` / `trae` / `claude-code` / `unknown`。

> **注意**：`{IDE_ROOT}` 指你当前的工作目录（即本仓库所在目录）。后续所有路径都以 `{IDE_ROOT}` 为基准。

### Step 2 — 安装配置文件

根据检测到的 IDE，运行对应安装脚本：

**Windows (PowerShell):**
```powershell
.\install.ps1 -IDE <检测到的IDE>
```

**macOS/Linux:**
```bash
./install.sh -i <检测到的IDE>
```

支持的 IDE 值：`qoder`, `trae`, `cursor`, `windsurf`（claude-code 映射到 cursor）。

### Step 3 — 配置 API Key

检查 `model-config.json` 中的 API Key（占位符 `${DEEPSEEK_API_KEY}` 等）：

1. 读取 `model-config.json`，检查所有 provider 的 `apiKey` 字段
2. 若包含 `\${...}` 占位符 → 向用户提问对应 API Key
3. 建议用户优先配置 **DeepSeek**（最稳定+支持缓存，家用级成本）
4. 用户提供后优先写入环境变量（`DEEPSEEK_API_KEY` 等），回退写入 `model-config.json`

```json
{
  "providers": [
    {
      "name": "deepseek",
      "apiKey": "sk-用户提供的key",
      "baseUrl": "https://api.deepseek.com/v1",
      "models": [ ... ]
    }
  ]
}
```

### Step 4 — 验证安装

创建测试工作目录并验证核心脚本可用：

```bash
node {IDE_ROOT}/helpers/hammer-bridge.cjs status
node {IDE_ROOT}/helpers/hang-state-manager.cjs --dashboard
```

若全部正常返回，告知用户安装完成并展示可用命令速查。

---

## 执行模式说明

当前框架有两种执行模式，AI 自动选路：

| IDE | Agent() 真并发 | `/夯` 执行模式 | 进度 UI | 子智能体落地 |
|-----|-----------------|-----------------|---------|--------------|
| **Qoder** | ✅ | 跨队 3 路并发 | IDE 对话框原生专家团卡片 | `.qoder/agents/*.md` |
| **Claude Code** | ✅ | 跨队 3 路并发 | Task 工具卡片 | `.claude/agents/*.md` |
| **Cursor** | ❌ | 串行角色切换 | 主会话文本 + CLI 看板 | `.cursor/rules/*.mdc` |
| **Trae** | ❌ | 串行角色切换 | 主会话文本 + CLI 看板 | `.trae/rules/*.md` |
| **Windsurf** | ❌ | 串行角色切换 | 主会话文本 + CLI 看板 | `.windsurf/rules/*.md` |

- 运行时 IDE 检测路径：`orchestrator-qoder.cjs detect-ide` → 自动选择模式，无需用户指定
- `/夯` 子智能体定义的**单一真源**在 `skills/kf-multi-team-compete/kf-multi-team-compete/agents/`，由 install 脚本按 IDE 分发
- 不支持 Agent() 的 IDE：子智能体 md 作为角色规则，主会话读取后轮换模拟三队

---

## 变量约定

| 变量 | 含义 | 示例值 |
|------|------|--------|
| `{IDE_ROOT}` | 项目根目录（AI 当前工作目录） | `D:\Projects\MyProject` |

所有技能和脚本使用 `{IDE_ROOT}` 变量化路径，确保跨平台一致。

---

## 触发词速查（AI 注册用）

| 触发词 | 注册到 IDE | 效果 |
|--------|-----------|------|
| `/夯` | Custom Instructions / Rules | 启动多团队竞争评审 |
| `/triple` | Custom Instructions / Rules | 启动三方协作评审 |
| `/align` | Custom Instructions / Rules | 需求对齐 |
| `/spec` | Custom Instructions / Rules | 技术规格 |
| `/prd` | Custom Instructions / Rules | PRD 生成 |
| `/review` | Custom Instructions / Rules | 代码审查 |
| `/search` | Custom Instructions / Rules | Web 搜索 |
| `/image` | Custom Instructions / Rules | 图片编辑 |
| `status` | 内置 | 进度看板 |

---

## 辅助脚本索引（AI 调用用）

```bash
# 状态管理
node {IDE_ROOT}/helpers/hang-state-manager.cjs --init "<任务>" --depth A|B|C
node {IDE_ROOT}/helpers/hang-state-manager.cjs --dashboard
node {IDE_ROOT}/helpers/hang-state-manager.cjs --sync-and-show

# 阶段追踪
node {IDE_ROOT}/helpers/hammer-bridge.cjs init --task "<任务>" --total-agents 18
node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-spawn --team red --agent fullstack --task-id T1
node {IDE_ROOT}/helpers/hammer-bridge.cjs status

# 门控执行
node {IDE_ROOT}/helpers/gate-executor.cjs --scan red-00.md blue-00.md green-00.md
node {IDE_ROOT}/helpers/gate-executor.cjs --status

# 并发编排（Qoder 专用）
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs detect-ide
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs fan-out --teams red,blue,green --stage 0
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs fan-in --teams red,blue,green --stage 0 --wait-ms 300000
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs concurrent-status

# 缓存预热（Qoder 并发前调用）
node {IDE_ROOT}/helpers/cache-warmup.cjs should-warm
node {IDE_ROOT}/helpers/cache-warmup.cjs mark

# 验证
node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-spec --stage review --required-sections "## Acceptance Criteria"
```

---

## 故障排除（AI 自检用）

| 现象 | AI 检查点 |
|------|----------|
| 技能未触发 | IDE 是否注册了触发词？检查 IDE 的 rules/custom-instructions 配置 |
| 路径错误 | `{IDE_ROOT}` 是否指向正确的项目根目录？ |
| API Key 无效 | 检查 `model-config.json` 中字段格式，确认环境变量已生效 |
| 状态丢失 | `.claude-flow/` 目录是否有写入权限？ |
| 缓存未生效 | DeepSeek 支持缓存，TTL 5min；其他供应商需手动检查 |

---

## 文档索引

| 文档 | 用途 | 阅读方 |
|------|------|--------|
| [快速开始](docs/01-快速开始.md) | 用户入门指南 | 用户 |
| [技能清单](docs/02-技能清单.md) | 所有技能详细说明 | AI + 用户 |
| [迁移指南](docs/03-迁移指南.md) | 从 Claude Code 迁移 | AI |
