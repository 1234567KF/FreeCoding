---
name: qoder-concurrent
description: /夯 技能的 Qoder 真并发分支 — 利用 Qoder Agent spawn 能力跨队 3 路并发执行
parent: kf-multi-team-compete
ide: qoder
---

# 夯 · Qoder 并发执行分支

> **前置**：主会话先运行 `node {IDE_ROOT}/helpers/orchestrator-qoder.cjs detect-ide`，若返回 `qoder` 且 `concurrent_capable=true`，进入本分支；否则回退 [SKILL.md](SKILL.md) 的通用串行流程。

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

### Step 3 — 三队 fan-out（并发 spawn）

主会话同时在**同一条回复**内触发 3 个 Agent 调用（并行 tool-use）：

```
Agent(subagent_type="kf-hammer-red-team",   prompt=<共享前缀 + 红队后缀>)
Agent(subagent_type="kf-hammer-blue-team",  prompt=<共享前缀 + 蓝队后缀>)
Agent(subagent_type="kf-hammer-green-team", prompt=<共享前缀 + 绿队后缀>)
```

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

### Step 4 — fan-in 阻塞等待

```bash
node {IDE_ROOT}/helpers/orchestrator-qoder.cjs fan-in \
  --teams red,blue,green --stage 5 --wait-ms 600000
```

- 轮询 3 队产物就绪状态
- 最长等待 10 分钟，超时视为失败
- 返回各队产物路径

### Step 5 — 裁判 + 对抗（可并发 spawn）

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

## 3. 并发看板监控

任意时刻查看三队实时进度：

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

| 子智能体 | 定义文件 | 职责 |
|---------|---------|------|
| 红队 | `.qoder/agents/kf-hammer-red-team.md` | 激进创新 Stage 0→5 |
| 蓝队 | `.qoder/agents/kf-hammer-blue-team.md` | 稳健工程 Stage 0→5 |
| 绿队 | `.qoder/agents/kf-hammer-green-team.md` | 安全保守 Stage 0→5 |
| 裁判 | `.qoder/agents/kf-hammer-judge.md` | 5 维加权评分 |
| 对抗 | `.qoder/agents/kf-hammer-adversary.md` | 8 维度魔鬼代言人 |

> 若 `.qoder/agents/` 目录不存在，先用 `/create-agent` 技能按上表生成，或参考各文件头部 frontmatter 手工创建。

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
| 子 Agent 返回空 | 检查 `.qoder/agents/` 对应文件是否存在且 frontmatter 正确 |
