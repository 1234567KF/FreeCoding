---
name: qoder-concurrent
description: /夯 技能的 Qoder 真并发分支 — 利用 Qoder Agent spawn 能力跨队 3 路并发执行
parent: kf-multi-team-compete
ide: qoder
---

# 夯 · Qoder 并发执行分支

> **前置**：主会话先运行 `node {IDE_ROOT}/helpers/orchestrator-qoder.cjs detect-ide`，若返回 `qoder` 且 `concurrent_capable=true`，进入本分支；否则回退 [SKILL.md](SKILL.md) 的通用串行流程。

## 0. 进度 UI 约定（重要）

**本分支依赖 Qoder 原生 Agent 调用卡片展示进度，不使用外部 Web 看板。**

- 主会话在**同一条回复内**并行发起 3 个 `Agent(…)` 调用，Qoder IDE 会在对话流里自动渲染 3 个 **并排的子 Agent 卡片**（类似自带专家团）
- 每个卡片可展开查看：`subagent_type` / 输入 prompt 摘要 / 实时状态（running/done/fail）/ 返回摘要
- 用户**无需离开对话框**即可看到红/蓝/绿三队的并行执行状态

CLI 看板（`hang-state-manager --concurrent-dashboard`）仅作为**可选调试工具**，供用户手动查询持久化状态，不是主 UI。

### Qoder 专家团卡片视觉示例

```
主会话：我将启动三队并发评审…
  ├─ ⬚️ Agent · kf-hammer-red-team       [running  0:23]  阶段: Stage 2
  ├─ 🟦 Agent · kf-hammer-blue-team      [running  0:23]  阶段: Stage 3
  └─ 🟩 Agent · kf-hammer-green-team     [running  0:23]  阶段: Stage 1

  （约 2-5 分钟后）

  ├─ ⬚️ Agent · kf-hammer-red-team       [✅ done  2:41]  DONE:red  (6产物)
  ├─ 🟦 Agent · kf-hammer-blue-team      [✅ done  3:12]  DONE:blue (6产物)
  └─ 🟩 Agent · kf-hammer-green-team     [✅ done  2:58]  DONE:green(6产物)

主会话：三队已返回，发起裁判 + 对抗…
  ├─ ⚖️  Agent · kf-hammer-judge          [running  0:08]
  └─ ⚔️  Agent · kf-hammer-adversary      [running  0:08]
```

每个卡片上的实时“阶段: Stage X”由子 Agent 的 `progress` 返回值提供（见 Step 3）。

## 1. 并发架构

```
主会话 (Team Lead)
  │
  ├── spawn Agent(kf-hammer-red-team)    ──┐
  ├── spawn Agent(kf-hammer-blue-team)   ──┤  跨队 3 路并发
  └── spawn Agent(kf-hammer-green-team)  ──┘
         │
         │ 各自内部串行 Stage 0→5（全栈→QA→Review→设计师）
         │ 各自产物写入 {team}-{NN}-*.md
         ▼
       主会话 fan-in：轮询 3 队产物就绪
         │
         ├── spawn Agent(kf-hammer-judge)       5 维加权评分
         ├── spawn Agent(kf-hammer-adversary)   8 维对抗质询
         ▼
       最终汇总报告
```

- **并发粒度**：跨队（红/蓝/绿同时推进），队内仍按角色串行
- **产物隔离**：文件系统命名约定 `{team}-{NN}-*.md`（NN = stage 两位数）
- **状态同步**：所有子 Agent 通过 `hammer-bridge.cjs agent-spawn/agent-done` 写入统一状态文件
- **缓存命中**：主会话启动前 `cache-warmup.cjs mark`，保证 3 路首请求命中 DeepSeek KV 缓存

## 2. 主会话执行流程

### Step 1 — IDE 检测与会话初始化

```bash
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs detect-ide
# 期望输出: qoder

node {IDE_ROOT}/helpers/hang-state-manager.cjs --init "<任务名>" --depth C
node {IDE_ROOT}/helpers/hang-state-manager.cjs --concurrent-mode qoder
```

### Step 2 — 缓存预热（避免 3 路并发首发全 miss）

```bash
# 检查是否需要预热
node {IDE_ROOT}/helpers/cache-warmup.cjs should-warm

# 若 need_warm=true，主会话用 emit-prompt 输出的文本发一次小请求预热
node {IDE_ROOT}/helpers/cache-warmup.cjs emit-prompt
# 发送该 prompt 给主模型（任意供应商，DeepSeek 最佳），不关心回复
node {IDE_ROOT}/helpers/cache-warmup.cjs mark
```

### Step 3 — 三队 fan-out（在同一条回复内并行 spawn）

主会话必须**在同一条回复里并行调用 3 个 Agent 工具**（不是串行调用），这才能触发 Qoder IDE 的“专家团并排卡片”视觉效果：

```
Agent(subagent_type="kf-hammer-red-team",   prompt=<共享前缀 + 红队后缀>)
Agent(subagent_type="kf-hammer-blue-team",  prompt=<共享前缀 + 蓝队后缀>)
Agent(subagent_type="kf-hammer-green-team", prompt=<共享前缀 + 绿队后缀>)
```

> ⏱️ 关键：三个 Agent 调用必须在**一个 assistant turn 的同一个 tool-use 块**中发出，否则会降级为串行，失去并排卡片 UI。

**共享前缀模板**（逐字相同，支撑缓存命中）：

```
你是 /夯 多团队竞争评审的子智能体。

[任务规格]
{任务名}
{任务描述}

[假设基线]（有歧义时自动采用，禁止反问主会话）
- {基线 1}
- {基线 2}
...

[执行清单]
Stage 0 对齐 → Stage 1 规格 → Stage 2 编码 → Stage 3 QA → Stage 4 代码审查 → Stage 5 前端设计

[状态同步铁律]
每完成一个 stage，执行：
  node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-done --team {team} --stage {NN} --output {team}-{NN}-*.md
遇阻时执行：
  node {IDE_ROOT}/helpers/hammer-bridge.cjs agent-fail --team {team} --stage {NN} --reason "..."

[Recording 模式]
不提问用户；CRITICAL 级歧义记录到 {team}-notes.md 后继续。

[完成信号]
Stage 5 产物生成后返回主会话，消息体 = "DONE:{team}"。
```

**差异化后缀**：

- 红队：`[角色定位] 激进创新，追求突破性方案，愿意承担技术风险换取更高的产品价值`
- 蓝队：`[角色定位] 稳健工程，追求可维护、可测试、长期稳定，严格遵守工程规范`
- 绿队：`[角色定位] 安全保守，追求最小风险、最强回退能力、最严合规`

### Step 4 — fan-in（依赖 Agent 返回值，无需轮询）

Qoder 的 `Agent(…)` 工具调用本身就是阻塞的：三个 Agent 并行执行，全部返回后主会话自然拿到三份输出。每份输出包含：

```
DONE:{team}
{产物清单 6 行}
{核心决策摘要 3-5 行}
```

主会话直接从返回值中解析红/蓝/绿三队产物路径，不需要轮询文件系统。

**辅助核对**（可选，用于验证一致性）：

```bash
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs fan-in \
  --teams red,blue,green --stage 5 --wait-ms 5000
```

- 因为 Agent 已经全部返回了，这里 `fan-in` 只是核对产物落盘状态，wait-ms 可以给很小的值
- 若某队 Agent 返回的 DONE 消息缺产物，主会话立刻重新 spawn 该队补打

### Step 5 — 裁判 + 对抗（同一回复内再次并发 spawn）

同样在**同一条回复内**并行调用 2 个 Agent，IDE 会渲染为第二轮并排卡片：

```
Agent(subagent_type="kf-hammer-judge",     prompt=<三队产物摘要 + 评分规范>)
Agent(subagent_type="kf-hammer-adversary", prompt=<三队产物摘要 + 8 维度质询框架>)
```

### Step 6 — 主会话汇总

主会话基于：
- 三队 Stage 5 产物
- 裁判评分结果
- 对抗质询清单

输出最终评审报告 `docs/hammer-final-report.md`，并：

```bash
node {IDE_ROOT}/helpers/hang-state-manager.cjs --complete
```

## 3. 并发看板监控（CLI 辅助，非主 UI）

> 本节内容仅供用户需要**离开当前对话**或在另一个终端里查询任务状态时使用。主 UI 是 Qoder 对话框内的 Agent 卡片，见 §0。

任意时刻查看三队持久化进度：

```bash
node {IDE_ROOT}/helpers/hang-state-manager.cjs --concurrent-dashboard
# 或简写
node {IDE_ROOT}/helpers/hang-state-manager.cjs -c

# JSON 格式给脚本调用
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs concurrent-status
```

典型输出：

```
┌─────────────────────────────────────────────────────────────────────┐
│  夯 Qoder 并发看板 (3路并行)                                        │
│                                                                     │
│  任务: 支付网关重构                                                 │
│  深度: C (完整流程)    模式: 并发 @ qoder                           │
│                                                                     │
│    红队              蓝队              绿队                         │
│    ███░░░░░░░  30%  ██████░░░░  60%  █████░░░░░  50%                │
│    stage_2         stage_4         stage_3                          │
│                                                                     │
│  各队阶段进度:                                                      │
│    S0  ✅              ✅              ✅                           │
│    S1  ✅              ✅              ✅                           │
│    S2  🔄              ✅              ✅                           │
│    S3  ⏳              ✅              🔄                           │
│    S4  ⏳              🔄              ⏳                           │
│    S5  ⏳              ⏳              ⏳                           │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. 失败恢复

- **某队失败**：主会话收到 `agent-fail`，可选择：
  - 重新 spawn 该队子 Agent
  - 直接跳过，用剩余两队继续
  - 降级到串行模式 `--serial-mode` + 手动推进
- **全部失败**：`--remove` 清理后回退 [SKILL.md](SKILL.md) 通用流程
- **主会话中断恢复**：依赖 `hang-state.json` + `hammer-state.json`，子 Agent 产物已落盘，重启主会话后 `fan-in` 仍可复用

## 5. 子智能体定义索引

**单一真源**：`skills/kf-multi-team-compete/kf-multi-team-compete/agents/`（IDE 无关）。
`install.ps1` / `install.sh` 按目标 IDE 分发到下表对应的部署路径。

| 子智能体 | 真源 | Qoder/Claude 部署 | Cursor 部署 | Trae/Windsurf 部署 | 职责 |
|---------|------|------------------|-------------|--------------------|------|
| 红队 | `agents/kf-hammer-red-team.md` | `.qoder/agents/`, `.claude/agents/` | `.cursor/rules/*.mdc` | `.trae/rules/`, `.windsurf/rules/` | 激进创新 Stage 0→5 |
| 蓝队 | `agents/kf-hammer-blue-team.md` | 同上 | 同上 | 同上 | 稳健工程 Stage 0→5 |
| 绿队 | `agents/kf-hammer-green-team.md` | 同上 | 同上 | 同上 | 安全保守 Stage 0→5 |
| 裁判 | `agents/kf-hammer-judge.md` | 同上 | 同上 | 同上 | 5 维加权评分 |
| 对抗 | `agents/kf-hammer-adversary.md` | 同上 | 同上 | 同上 | 8 维度魔鬼代言人 |

> **本分支（真并发）限 Qoder 和 Claude Code 使用**。Cursor/Trae/Windsurf 不支持 Agent() spawn，请回到 [SKILL.md](SKILL.md) 的通用串行流程，子智能体 md 在它们的 rules/ 目录下作为角色规则使用。
>
> 若部署目录下缺文件，运行 `install.ps1 -IDE <ide>` （或 `install.sh -i <ide>`）重新分发。

## 6. 与通用串行版的差异对照

| 维度 | 通用串行（[SKILL.md](SKILL.md)） | Qoder 并发（本分支） |
|------|-------------------------------|-------------------|
| 执行 | 当前会话角色切换 | 子 Agent spawn |
| 耗时 | 红→蓝→绿串行（3x） | 3 路并发（1x） |
| 状态追踪 | hammer-bridge + hang-state | 同上 + orchestrator-qoder fan-in |
| 产物隔离 | 文件命名约定 | 文件命名约定 + Agent 上下文隔离 |
| 缓存 | 顺序请求自然命中 | cache-warmup 预热 + 共享前缀 |
| 中断恢复 | 文件持久化 | 文件持久化（子 Agent 也写文件） |

## 7. 故障排除

| 现象 | 排查 |
|------|------|
| `detect-ide` 返回 unknown | 检查 `.qoder/` 是否存在、`QODER_IDE` 环境变量 |
| fan-in 超时 | 扫描 `.claude-flow/hammer-artifacts/` 和 `docs/` 目录，确认产物文件名符合 `{team}-{NN}-*.md` |
| 缓存未命中 | `cache-warmup.cjs status` 查看最后 mark 时间，>4min 需重新预热 |
| 子 Agent 返回空 | 检查部署目录（`.qoder/agents/` 或 `.claude/agents/`）对应文件是否存在且 frontmatter 正确；如缺文件运行 `install.ps1 -IDE <ide>` 重新分发 |
