# AI编程智驾 — 通用适配版项目配置

> 本文件为 IDE 主配置模板，适配到具体 IDE 时：
> - Qoder → 重命名为 `qoder.md`
> - Trae → 重命名为 `.trae/rules/project_rules.md`
> - Cursor → 重命名为 `.cursorrules`
> - Windsurf → 重命名为 `.windsurfrules`
>
> 通用适配版遵循**稳、省、准、测的准、夯、快、懂**六大原则。

## 技能一览

### kf- 系列（团队自建）

| 技能                          | 别名               | 原则   | 调用链                                                                                                                                             | 说明                                                                                                             |
| ----------------------------- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `kf-go`                     | `/go`            | 快     | 独立                                                                                                                                               | 工作流导航：查看全局路径和当前进度                                                                               |
| `kf-spec`                   | spec coding        | 快     | 自动调用 kf-alignment、kf-model-router；被 `/夯` 调用                                                                                            | Spec 驱动开发：需求 → Spec → 分步实施                                                                          |
| `kf-code-review-graph`      | `/review-graph`  | 省     | 被 `/夯` Stage 4 自动调用                                                                                                                        | 代码审查依赖图谱，轻装上阵快速提取                                                                               |
| `kf-web-search`             | `/web-search`    | 准     | 被 `/夯` agent 按需自动调用                                                                                                                      | 多引擎智能搜索，agent 自动搜索技术方案                                                                           |
| `kf-browser-ops`            | `/browser-ops`   | 测的准 | 被 `/夯` Stage 3 自动调用                                                                                                                        | 浏览器自动化测试，Playwright 复现 bug                                                                            |
| `kf-scrapling`              | —                 | 准     | 被 `/夯` Stage 1/2/3 按需自动调用                                                                                                                | Web 爬虫+反反爬，深度数据采集，替代/补充 web-search                                                              |
| `kf-opencli`                | —                 | 准     | 被 `/夯` Stage 1/2/3 按需自动调用                                                                                                                | OpenCLI — 100+ 平台 CLI 数据直取（知乎/B站/微博/GitHub/Reddit/HN/arXiv），补充 web-search 和 scrapling 中间地带 |
| `kf-grant-research`         | —                 | 准     | Pipeline + Inversion + Generator，调用 kf-scrapling + kf-web-search + kf-add-skill                                                                   | 课题申报研究助手：顶刊搜索→论文分析→研究空白→申报材料                                                         |
| `kf-reverse-spec`           | —                 | 准/省  | Pipeline，调用 kf-alignment + kf-web-search + kf-code-review-graph                                                                                 | 存量代码→Spec/文档 逆向流水线                                                                                   |
| `kf-multi-team-compete`     | **`/夯`**  | 夯     | **主入口**，串行调用 12 个技能 + Pipeline 引擎                                                                                               | 红蓝绿队三视角串行竞争评审（文件隔离+阶段交错+缓存优化）                                                    |
| `kf-alignment`              | `/对齐`          | 懂     | 被 kf-spec、`/夯`、kf-prd-generator 自动调用                                                                                                     | 对齐工作流：动前谈理解，动后谈 diff                                                                              |
| `kf-autoresearch`           | —                 | 准     | Pipeline + Loop，自动调用 kf-model-router                                                                                                          | Karpathy 自主 ML 实验：改 train.py→5分钟训练→验证val_bpb→循环                                                 |
| `kf-model-router`           | 模型路由/智能路由/安全路由 | 省+稳+准 | **手动/规则触发**：多模型智能路由引擎（DeepSeek Pro/Flash + MiniMax + Kimi），语义分类+加权评分+断路器+降级链+令牌桶限流+密钥隔离 | 三位一体路由引擎：省（模型性价比）+ 稳（断路器/限流/密钥隔离）+ 准（语义分析精准分配） |
| `kf-monitor`                | —                 | 测的准  | 独立，监测者仪表盘：Token 追踪 + 重审触发检测 + 成本分析                                                                                             | 监测者：SQLite + Express 仪表盘，独立于 Agent 自报的数据采集与分析                                              |
| `kf-saver`                  | —                 | 省     | 独立，会话成本节省追踪：自动记录每次 API 调用的 token 节省数据                                                                                       | 节省追踪器：手动触发记录技能节省效果到 monitor DB                                                           |
| `kf-prd-generator`          | `/prd-generator` | 快     | 自动调用 kf-alignment（产出后 Hook 对齐）；被 `/夯` Pre-Stage 自动调用                                                                           | SDD Excel → PRD 生成器                                                                                          |
| `kf-triple-collaboration`   | triple             | 夯     | 串行三方视角（轻量版 `/夯`）                                                                                                                       | 三方协作评审（文件隔离+摘要传递）                                                                                |
| `kf-ui-prototype-generator` | —                 | 快     | 被 `/夯` Stage 2/5 自动调用                                                                                                                      | UI 原型 HTML 生成                                                                                                |
| `kf-image-editor`           | —                 | 快     | 被 `/夯` Stage 2/5 自动调用                                                                                                                      | AI 自然语言 P 图，MiniMax 图像 API                                                                               |
| `kf-kb-envoy`               | —                 | 准     | 独立                                                                                                                                               | Knowledge Base Envoy：知识库/raw/ → 知识库/wiki/ → 知识库管理全生命周期                                            |
| `kf-skill-design-expert`    | —                 | 稳     | 独立，包含 Harness Engineering 评审体系                                                                                                            | Skill 设计专家 + 五根铁律审计                                                                                    |
| `kf-token-tracker`         | `/token-tracker` | 准     | 被 `/夯` agent 按需自动调用                                                                                                                      | Token全量追踪 + 技能调用链路追踪 + 成本估算                                                                      |
| `kf-doc-consistency`        | —                 | 准/省  | Pipeline + Reviewer，被 kf-add-skill 自动调用                                                                                                      | 文档全局一致性自检                                                                                               |
| `kf-add-skill`              | —                 | 稳     | 关键词搜索→下载安装→同步所有文档+SKILL.md，自动触发一致性检查                                                                                    | 技能安装管家：搜索安装+文档全自动同步                                                                            |
| `kf-langextract`            | —                 | 准     | Pipeline + Tool Wrapper + Generator，调用 lx.extract()                                                                                             | LLM 驱动结构化提取（非结构化文本→JSON/CSV/YAML），带 source grounding                                           |
| `kf-exa-code`              | /exa-code          | 准     | 被 `/夯` Stage 1/2/4 按需调用；降级链 kf-web-search → kf-scrapling                                                                              | Exa Code 引擎：知识缺口检测→代码搜索→极简返回，面向 API/库/SDK 知识断层                               |
| `kf-evolution`              | —                 | 稳     | 独立，进化机制：AI 自我优化与迭代改进                                                                                                             | 进化机制：从执行历史中学习，自动优化 prompt 和策略                                                              |
| `lambda-lang`               | λ                 | 省     | **自动注入**：串行模式下各阶段产物注入 Λ 通信协议（3x 压缩）；被 `/夯`、`/triple` 自动调用                                                   | Agent-to-Agent 原生语言，340+ 原子，7 域（a2a/evo/code/...），握手 `@v2.0#h`                                   |
| `claude-code-pro`           | ccp                | 省     | **手动触发**：Token 高效调度建议（不 spawn 省 10K-15K token）；完成回调替代轮询（省 80-97%）；被 `/夯`、`/triple` 自动调用 | Token 高效调度：知道何时不 spawn Agent，回调替代轮询                                                             |

### 上游技能（非自建，不加 kf- 前缀）

| 技能                                   | 来源                                                 | 说明                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `gspowers`                           | fshaan                                               | SOP 流程导航                                                                                                                          |
| `gstack`                             | garrytan                                             | 产品流程框架                                                                                                                          |
| **jeffallan/claude-skills** (66) | [jeffallan](https://github.com/jeffallan/claude-skills) | 第三方技能合集，分 10 类：12 语言、7 后端、7 前端/移动、5 基础设施、8 API/架构、5 质量/测试、5 DevOps、3 安全、6 数据/ML、8 平台/专业 |

## 目录结构

```
{IDE_ROOT}/
├── {IDE_CONFIG}               # 本文件（IDE 主配置）
├── settings.json              # IDE 配置（移除 Claude 专属字段后的通用格式）
├── model-config.json          # 多供应商模型配置（DeepSeek/MiniMax/Kimi）
├── install.ps1                # Windows 安装脚本
├── install.sh                 # Linux/macOS 安装脚本
├── helpers/                   # 编排助手 + 审计脚本
│   ├── hammer-bridge.cjs      # Agent 状态追踪 + Pipeline 编排（串行模拟版）
│   ├── hang-state-manager.cjs # 状态持久化 + 中断恢复（队级隔离）
│   ├── gate-executor.cjs      # 反转门控（文本交互版）
│   ├── harness-gate-check.cjs # 机械化门控验证
│   ├── harness-audit.cjs      # 五根铁律全路径审计
│   ├── skill-validator.cjs    # SKILL.md 行为级验证框架
│   ├── review-rerun-check.cjs # 条件重审触发判断
│   ├── quality-signals.cjs    # 标准化质量信号发射器
│   ├── cache-audit.cjs        # KV Cache 前缀一致性审计
│   ├── ccp-smart-dispatch.cjs # CCP 智能调度 + Lambda 注入
│   ├── key-isolator.cjs       # 多供应商密钥隔离
│   ├── rate-limiter.cjs       # 令牌桶限流
│   ├── model-provider-registry.cjs # 统一模型配置加载器
│   ├── smart-dispatcher.cjs   # CJK 感知任务分类 + 成本优先模型分配
│   ├── model-health.cjs       # 三态断路器 + 健康探测
│   └── ...（+9 其他 helper）
├── hooks/                     # 监控钩子（手动触发版）
├── monitor/                   # 监测者仪表盘（Express + SQLite，端口3456）
├── memory/                    # 记忆目录（项目级 JSON/SQLite）
├── templates/                 # 模板库
├── rules/                     # 规则约束
│   ├── cache-optimization.md  # KV Cache 缓存优化
│   ├── lean-ctx.md            # 上下文压缩引擎规则
│   └── mvp-coding-checklist.md # 编码错误检查清单
└── skills/                    # 技能集合
    ├── kf-go/                 # 工作流导航
    ├── kf-spec/               # Spec 驱动开发
    ├── kf-code-review-graph/  # 代码审查图谱
    ├── kf-web-search/         # 多引擎搜索
    ├── kf-browser-ops/        # 浏览器自动化
    ├── kf-multi-team-compete/ # 多团队竞争（串行版）
    ├── kf-alignment/          # 对齐工作流
    ├── kf-autoresearch/       # AI 自主 ML 实验（单会话循环版）
    ├── kf-model-router/       # 模型路由（手动触发版）
    ├── kf-prd-generator/      # PRD 生成器
    ├── kf-triple-collaboration/ # 三方协作（串行版）
    ├── kf-ui-prototype-generator/ # UI 原型
    ├── kf-image-editor/       # AI 自然语言 P 图
    ├── kf-kb-envoy/           # Knowledge Base Envoy
    ├── kf-reverse-spec/       # 存量代码→Spec 逆向
    ├── kf-skill-design-expert/ # Skill 设计
    ├── kf-token-tracker/      # Token全量追踪
    ├── kf-add-skill/          # 技能安装管家
    ├── kf-doc-consistency/    # 文档一致性自检
    ├── kf-exa-code/           # Exa Code 引擎
    ├── kf-evolution/          # 进化机制
    ├── kf-scrapling/          # Web 爬虫
    ├── kf-opencli/            # OpenCLI 数据直取
    ├── kf-grant-research/     # 课题申报研究助手
    ├── kf-langextract/        # LLM 驱动结构化提取
    ├── kf-monitor/            # 监测者仪表盘
    ├── kf-saver/              # 会话成本节省追踪
    ├── lean-ctx/              # 上下文压缩引擎
    ├── lambda-lang/           # Agent-to-Agent 原生语言
    ├── claude-code-pro/       # Token 高效调度
    ├── gspowers/              # SOP 导航（上游）
    ├── gstack/                # 产品流程（上游）
    └── ... (+66 来自 jeffallan/claude-skills)
```

## 快速开始

```powershell
# 1. 运行安装脚本（首次或技能更新时）
.\install.ps1 -IDE qoder    # 或 -IDE trae / -IDE cursor

# 2. 配置 API Key（在 IDE 设置中）
# DEEPSEEK_API_KEY / MINIMAX_API_KEY / KIMI_API_KEY

# 3. 在项目目录启动 IDE
# Qoder: 打开项目目录
# Trae: 打开项目目录
# Cursor: 打开项目目录
```

## 常用触发词

| 触发词                                                                 | 技能                      | 原则   | 调用方式                                                          |
| ---------------------------------------------------------------------- | ------------------------- | ------ | ----------------------------------------------------------------- |
| `/go` / `/导航` / `/开始`                                        | kf-go                     | 快     | 手动触发                                                         |
| `/夯 [任务]`                                                         | kf-multi-team-compete     | 夯     | 手动触发 → 串行调用 12+ 子技能                                     |
| `spec coding` / `写spec文档`                                       | kf-spec                   | 快     | 手动触发 → 自动调用 kf-alignment + kf-model-router                |
| `/对齐` / `说下你的理解`                                           | kf-alignment              | 懂     | 手动触发 / 被多个技能自动调用                                    |
| `/review-graph`                                                      | kf-code-review-graph      | 省     | 手动触发 / 被 `/夯` 调用                                        |
| `/web-search [问题]`                                                 | kf-web-search             | 准     | 手动触发 / 被 `/夯` 按需调用                                    |
| `/browser-ops`                                                       | kf-browser-ops            | 测的准 | 手动触发 / 被 `/夯` 调用                                        |
| `/gspowers`                                                          | gspowers                  | 稳     | 手动触发 / Pipeline 引擎被 `/夯` 集成                            |
| `/prd-generator`                                                     | kf-prd-generator          | 快     | 手动触发 → 自动调用 kf-alignment                                  |
| `triple [任务]`                                                      | kf-triple-collaboration   | 夯     | 手动触发 → 串行三方视角                                          |
| `模型路由` / `省模式` / `智能路由` / `模型调度` / `smart router` / `安全路由` / `safe router` / `断路器` / `限流` / `多供应商` / `多模型` | kf-model-router | 省+稳+准 | 手动触发：语义分类+加权评分+断路器+降级链+令牌桶限流+密钥隔离 |
| `Harness 评审` / `五根铁律审计`                                    | kf-skill-design-expert    | 稳     | 手动触发：全路径扫描，评分矩阵 + 缺陷分级                        |
| `/token-tracker` / `/skill-monitor` / `技能监控` / `使用率` / `token成本` | kf-token-tracker | 准     | 手动触发：Token全量追踪 + 技能调用追踪 + 成本估算                 |
| `P图` / `改图` / `修图` / `去水印`                             | kf-image-editor           | 快     | 手动触发 / 被 `/夯` Stage 2/5 调用                              |
| `摄入文件` / `ingest` / `lint` / `检查知识库` / `更新知识库` | kf-kb-envoy               | 准     | 手动触发：知识库/raw/ → 知识库/wiki/ 管理                        |
| `自动实验` / `ai实验` / `实验跑一夜` / `autoresearch`          | kf-autoresearch           | 准     | 手动触发：改代码→训练→验证→循环                                 |
| `装技能` / `安装技能` / `添加技能` / `搜索技能`                | kf-add-skill              | 稳     | 手动触发：搜索→安装→文档全同步→一致性检查                       |
| `一致性` / `文档自检` / `doc consistency`                        | kf-doc-consistency        | 准/省  | 手动触发 / 被 kf-add-skill 自动调用                              |
| `爬虫` / `抓取` / `scrape` / `反反爬`                          | kf-scrapling              | 准     | 手动触发 / 被 `/夯` Stage 1/2/3 按需调用                        |
| `热榜` / `平台抓取` / `CLI数据` / `opencli`                    | kf-opencli                | 准     | 手动触发 / 被 `/夯` Stage 1/2/3 按需调用                        |
| `论文` / `查论文` / `学术搜索` / `文献`                        | kf-web-search (fallback)  | 准     | 手动触发：学术论文搜索                                           |
| `提取` / `结构化提取` / `parse` / `langextract`                | kf-langextract            | 准     | 手动触发：非结构化文本→JSON/CSV/YAML                            |
| `逆向` / `存量代码` / `代码扫描` / `逆向工程`                  | kf-reverse-spec           | 准/省  | 手动触发：存量代码→Spec/文档 逆向流水线                         |
| `课题申报` / `科研项目` / `国自然` / `研究计划`                | kf-grant-research         | 准     | 手动触发：论文搜索→分析→gap→申报材料                            |
| `UI原型` / `原型生成` / `prototype`                              | kf-ui-prototype-generator | 快     | 手动触发 / 被 `/夯` Stage 2/5 调用                              |
| `ccp` / `智能调度` / `回调`                                      | claude-code-pro           | 省     | 手动触发：Token 高效调度建议                                     |
| `λ` / `lambda` / `!ta ct` / `@v2.0#h` / `agent通信`         | lambda-lang               | 省     | 手动触发：Lambda 压缩通信协议注入                                |
| `exa-code` / `查代码示例` / `找API用法` / `代码搜索` / `查库文档` | kf-exa-code        | 准     | 手动触发 / 被 `/夯` Stage 1/2/4 按需调用                        |
| `进化` / `自我优化` / `evolve`                                   | kf-evolution              | 稳     | 手动触发：AI 自我优化与迭代改进                                  |
| `监测者` / `仪表盘` / `dashboard` / `token监测`                   | kf-monitor                | 测的准  | 手动触发：Token 追踪 + 成本分析                                   |
| `节省追踪` / `saver` / `成本节省`                                  | kf-saver                  | 省     | 手动触发：会话成本节省追踪                                        |

## 串行调用链速览（/夯）

```
用户触发 "/夯 [任务]"
  │
  ├─ kf-model-router 多供应商动态路由（DeepSeek/MiniMax/Kimi 手动/规则分流）
  │
  ├─ claude-code-pro 智能调度建议 → 判断是否需要多视角（<3 文件则建议单视角，省 10K-15K token）
  │
  ├─ Pre-Stage：kf-prd-generator → PRD.md（条件触发：输入含 SDD Excel 时）
  │
  └─ 三队 Pipeline 串行（gspowers Pipeline 引擎）
       │
       ├─ lambda-lang 注入 ← 各阶段产物注入 Λ 通信协议（3x 压缩）
       ├─ claude-code-pro 回调注入 ← 各阶段产物注入完成回调（不轮询）
       │
       ├─ Stage 0: kf-alignment   ← 需求对齐（红/蓝/绿 依次执行，产物隔离）
       ├─ Stage 1: kf-spec        ← 需求基线（红/蓝/绿 依次执行，产物隔离）
       ├─ Stage 2: kf-web-search  ← 技术资料搜索（按需）
       ├─ Stage 2: kf-scrapling   ← 深度网页抓取（按需，反反爬）
       ├─ Stage 2: kf-opencli     ← 平台数据 CLI 直取（按需，100+ 平台）
       ├─ Stage 2: kf-exa-code    ← 代码知识检索（按需）
       ├─ Stage 2: kf-ui-prototype-generator ← UI 原型
       ├─ Stage 3: kf-browser-ops ← 自动化测试
       ├─ Stage 4: kf-code-review-graph ← 代码审查
       ├─ Stage 5: 方案汇总 + 裁判评分
       └─ 汇总融合 → 对抗质疑 → 终版方案
```

## 全局依赖

| 工具         | 安装命令                                                             | 说明                                                             |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Node.js      | `winget install OpenJS.NodeJS.LTS` 或官网下载                      | 运行环境（>= 18）                                                |
| lean-ctx     | 见 INSTALL.md                                                        | 上下文压缩引擎，90+ 压缩模式（手动调用）                         |
| OpenCLI      | `npm install -g @jackwener/opencli`                                | 100+ 平台 CLI 数据提取                                           |
| Playwright   | `npm install -g playwright`                                        | 浏览器自动化（kf-browser-ops 依赖）                              |
| Scrapling    | `pip install scrapling`                                            | Web 爬虫（kf-scrapling 依赖）                                    |

## 项目隔离

- **记忆隔离**：每个项目的记忆存储在 `{IDE_ROOT}/memory/`
- **配置隔离**：`settings.json` 只影响本项目
- **技能隔离**：kf- 系列技能为项目本地安装

## 更多信息

- [通用适配方案-从Claude_Code迁移AI_Agent框架.md](./通用适配方案-从Claude_Code迁移AI_Agent框架.md) — 适配方案总纲
- [实施计划-通用适配改造.md](./实施计划-通用适配改造.md) — 施工蓝图
- [memory/MEMORY.md](memory/MEMORY.md) — 跨会话记忆索引
- [memory/harness-audit-history.md](memory/harness-audit-history.md) — Harness 评审历史

## Harness Engineering 评审

```bash
# 全路径五根铁律审计
node {IDE_ROOT}/helpers/harness-audit.cjs --all --verbose
```

## 重要提示

### 关于 Hooks（手动触发替代方案）

通用 IDE 暂不支持 Claude Code 的自动 Hooks 系统。以下原自动触发功能已改为手动/规则触发：

| 原 Hook | 替代方案 |
|---------|---------|
| `PreToolUse` (Skill) | 技能开始时手动调用 `node {IDE_ROOT}/helpers/hook-handler.cjs pre-skill` |
| `PreToolUse` (Bash) | 命令前手动调用 `node {IDE_ROOT}/helpers/hook-handler.cjs pre-bash` |
| `PostToolUse` (Edit) | 编辑后手动调用 `node {IDE_ROOT}/helpers/hook-handler.cjs post-edit` |
| `SessionStart` | 会话开始时手动执行 `node {IDE_ROOT}/helpers/hook-handler.cjs session-restore` |
| `SessionEnd` | 会话结束时手动执行 `node {IDE_ROOT}/helpers/hook-handler.cjs session-end` |

### 关于 Agent 并发（串行模拟替代方案）

通用 IDE 暂不支持多 Agent 并发。`/夯` 和 `triple` 已改为串行执行模式：

- 三队依次执行，每队产物独立写入文件（`red-*.md` / `blue-*.md` / `green-*.md`）
- 阶段间仅传递压缩摘要（非全文），防止上下文污染
- 串行模式缓存命中率反而优于并行（顺序请求共享前缀）

### 关于模型路由（手动切换替代方案）

通用 IDE 暂不支持 `/set-model` 自动切换。模型路由改为：

- 技能 SKILL.md 中声明 `recommended_model`（pro/flash）
- IDE 规则提示用户手动切换模型
- 或脚本输出推荐模型供用户参考
