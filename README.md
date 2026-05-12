# ChronoCoding — AI 编程智驾框架（通用适配版）

## ⚠️ 下载后必看

1. **下载后请先改名**：
   - 若下载的文件名为 `{IDE_CONFIG}.template`，请重命名为 `qoder.md` 或 `project_rules.md`
   - `qoder.md` → 用于 Qoder
   - `project_rules.md` → 用于 Trae

2. **安装目录说明**：
   - **Qoder**：将文件安装到项目根目录的 `.qoder/` 子目录下
   - **Trae**：将文件安装到项目根目录的 `.trae/` 子目录下

## 框架概述

ChronoCoding 是 AI 编程智驾框架，已从 Claude Code 专属改造为 **通用适配版**，可适配 Qoder、Trae、Cursor 等支持自定义规则/技能的 AI IDE。

### 核心能力

| 能力 | 说明 |
|------|------|
| `/夯` | 多团队竞争评审（红蓝绿三队串行执行） |
| `/triple` | 红蓝评审三方协作（串行执行） |
| `/align` | 需求对齐 |
| `/spec` | 技术规格生成 |
| `/review` | 代码审查 + 依赖图谱 |
| `/prd` | PRD 文档生成 |
| `/search` | 智能 Web 搜索 |
| `/image` | AI 图片编辑（Gemini API） |

---

## 给 AI 的安装说明

### 步骤 1: 理解目录结构

```
{IDE_ROOT}/                    # 项目根目录，AI 的工作目录
├── skills/                   # 技能目录
│   ├── kf-multi-team-compete/ # /夯 技能（核心）
│   ├── kf-alignment/          # 对齐技能
│   ├── kf-spec/               # 规格技能
│   └── ...                   # 其他 18+ 技能
├── helpers/                  # 辅助脚本
│   ├── hammer-bridge.cjs     # 串行状态机（核心）
│   ├── hang-state-manager.cjs # 状态持久化
│   ├── gate-executor.cjs     # 门控执行器
│   └── ...                   # 其他 25+ 脚本
├── rules/                    # 全局规则
├── memory/                   # 记忆系统
├── docs/                    # 用户文档
├── model-config.json         # 模型配置（需填入 API Key）
├── install.ps1 / install.sh   # 安装脚本
└── {IDE_CONFIG}.template     # IDE 配置模板
```

### 步骤 2: 配置模型 API Key

1. 打开 `model-config.json`
2. 在对应 provider 下填入你的 API Key：

```json
{
  "providers": {
    "deepseek": { "apiKey": "sk-your-key" },
    "minimax": { "apiKey": "your-key" },
    "kimi": { "apiKey": "your-key" }
  }
}
```

3. 支持的模型（按供应商）：
   - **DeepSeek**: `deepseek-chat` (pro), `deepseek-chat` (flash)
   - **MiniMax**: `MiniMax-Text-01` (pro), `abab6.5s-chat` (flash)
   - **Kimi**: `moonshot-v1-128k` (pro), `moonshot-v1-32k` (flash)

### 步骤 3: 运行安装脚本

**重要**：安装脚本会将文件安装到**项目目录**下的隐藏目录中：
- **Qoder** → 项目根目录的 `.qoder/` 子目录
- **Trae** → 项目根目录的 `.trae/` 子目录

**Windows:**
```powershell
.\install.ps1 -IDE qoder
```

**macOS/Linux:**
```bash
./install.sh -i qoder
```

支持的 IDE 标识: `qoder`, `trae`, `cursor`, `vscode`, `windsurf`

### 步骤 4: 验证安装

```bash
node {IDE_ROOT}/helpers/hammer-bridge.cjs status
node {IDE_ROOT}/helpers/hang-state-manager.cjs --dashboard
```

---

## 变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `{IDE_ROOT}` | 项目根目录 | `D:\Projects\MyProject` |
| `{IDE_CONFIG}` | IDE 配置目录 | `.qoder` 或 `.trae` |

**重要**：所有技能和脚本使用 `{IDE_ROOT}` 变量化，适配不同 IDE 时自动替换。

---

## 串行执行模式说明

### 原 Claude Code 并发模式

- Agent() spawn 12+ 真并发 Agent
- 红蓝绿三队同时运行
- ruflo swarm 面板追踪状态

### 通用适配串行模式

- 当前 AI 会话按角色切换串行执行
- 红队 Stage 0→5 → 蓝队 Stage 0→5 → 绿队 Stage 0→5
- 通过文件系统状态机追踪进度

### 关键差异

| 场景 | Claude Code | 通用 IDE |
|------|------------|----------|
| 执行 | Agent() spawn | 当前会话角色切换 |
| 产物隔离 | 进程隔离 | 文件隔离（`red-*.md`等） |
| 状态追踪 | ruflo 面板 | `hammer-bridge.cjs` + `hang-state.json` |
| 中断恢复 | 会话丢失 | 文件持久化，支持断点续传 |
| 缓存优化 | 并发共享前缀 | 串行顺序请求，命中率更高 |

---

## 触发词速查

| 触发词 | 功能 | 调用技能 |
|--------|------|----------|
| `/夯` | 多团队竞争评审 | kf-multi-team-compete |
| `/triple` | 红蓝评审 | kf-triple-collaboration |
| `/align` | 需求对齐 | kf-alignment |
| `/spec` | 技术规格 | kf-spec |
| `/review` | 代码审查 | kf-code-review-graph |
| `/prd` | PRD 生成 | kf-prd-generator |
| `/search` | Web 搜索 | kf-web-search |
| `/image` | 图片编辑 | kf-image-editor |
| `/go` | 流程地图（在 /夯 中） | 内置于 kf-multi-team-compete |
| `status` | 进度看板 | hang-state-manager.cjs |

---

## 辅助脚本速查

```bash
# 状态管理
node {IDE_ROOT}/helpers/hang-state-manager.cjs --init "<任务>" --depth A|B|C
node {IDE_ROOT}/helpers/hang-state-manager.cjs --dashboard
node {IDE_ROOT}/helpers/hang-state-manager.cjs --sync-and-show

# 阶段追踪
node {IDE_ROOT}/helpers/hammer-bridge.cjs init --task "<任务>" --total-agents 18
node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-spawn --team red --agent fullstack --task-id T1
node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-done --team red --agent fullstack --output red-01.md
node {IDE_ROOT}/helpers/hammer-bridge.cjs status

# 门控
node {IDE_ROOT}/helpers/gate-executor.cjs --scan red-alignment.md blue-alignment.md green-alignment.md
node {IDE_ROOT}/helpers/gate-executor.cjs --status
node {IDE_ROOT}/helpers/gate-executor.cjs --answer answers.json

# 验证
node {IDE_ROOT}/helpers/harness-gate-check.cjs --skill kf-spec --stage review --required-sections "## Acceptance Criteria"
```

---

## 故障排除

| 问题 | 解决 |
|------|------|
| 技能未触发 | 检查 IDE 是否注册了触发词 |
| 路径错误 | 确认 `{IDE_ROOT}` 已正确设置 |
| API Key 无效 | 检查 `model-config.json` 格式 |
| 状态丢失 | 确认 `.claude-flow/` 目录有写入权限 |
| 模型不支持缓存 | DeepSeek 支持缓存，其他供应商需手动处理 |

---

## 相关文档

- [快速开始](docs/01-快速开始.md) — 用户级快速上手指南
- [技能清单](docs/02-技能清单.md) — 所有技能详细说明
- [迁移指南](docs/03-迁移指南.md) — 从 Claude Code 迁移说明
