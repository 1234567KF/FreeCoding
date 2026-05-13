# Agent Prompt Prefix — 标准化共享前缀

> **目的**：所有 `/夯` pipeline agent 使用完全相同的共享前缀，仅差异化团队角色和阶段任务。
> **缓存效果**：共享前缀命中 DeepSeek 服务器端 KV 缓存（TTL 5min），
> N 个 agent 的输入成本 ≈ 1x(首次全价) + (N-1)×(缓存命中价 + 差异化后缀全价)。
> Pro 模型价差 120x（¥3/M → ¥0.025/M），Flash 模型价差 50x（¥1/M → ¥0.02/M）。
>
> 详细原理和策略见：`{IDE_ROOT}/rules/cache-optimization.md`

## 使用方式

协调者在 spawn agent 时，prompt MUST 按以下结构组织：

```
[共享前缀 — 严格控制在 300-500 token，所有 agent 逐字相同]
  ├── 项目上下文（~100 token）
  ├── 工具与约束（~100 token）
  ├── 通信与回调（~80 token）
  └── 输出格式（~80 token）

[差异化后缀 — 每个 agent 不同]
  ├── 团队角色（Red/Blue/Green）
  ├── 阶段说明（Stage 0-5）
  └── 具体任务描述
```

## 共享前缀模板

使用以下模板作为所有 agent prompt 的开头部分。**MUST 逐字复制**（包括空格和换行）。

### 缓存预热提示

Spawn 第一个 agent 前，协调者（或调用方）应先发一次预热请求：

```
预热请求的 system prompt = 共享前缀模板 + 最长可能文档
预热请求的 messages = [{role: "system", content: "<共享前缀 + 最长文档>"}, {role: "user", content: "预热请求——无需实际处理"}]
```

预热完成后，所有 agent 的共享前缀部分从缓存读取。

### 模板内容

```
### SHARED PREFIX START — 以下内容所有 agent 逐字相同，命中 DeepSeek KV 缓存

## 项目上下文

你在 D:\AICoding 项目中工作（AI 编程工作台多 Agent 竞争评审系统）。
配置见 CLAUDE.md，技能见 {IDE_ROOT}/skills/。

## 工具与约束

可用工具：Bash, Read, Write, Edit, Grep, Glob, Agent, TaskCreate, TaskUpdate, SendMessage, WebSearch, WebFetch。
优先使用 ctx_read/ctx_shell/ctx_search 替代原生工具（lean-ctx 规则）。

## 通信与回调

- Lambda 协议: @v2.0#h 握手 | !ta ct @task <描述> 声明 | !ta st @status <状态> 更新 | !ta out @artifact <路径> 提交
- CCP 回调: 完成后通知协调者，不轮询；简单任务（<3 文件）直接提交，不 spawn 子 agent

## 输出格式

1. 产出写入 {team}-{stage}-{name}.md 文件（UTF-8，正斜杠路径）
2. 完成: !ta st @status done @artifact <路径>
3. 阻塞: !ta st @status blocked @reason <原因>
4. 参考下方「技能路由指引」表格，按需使用对应技能

## TDD 约束（编码阶段必须遵守）

1. **测试先行**：编码前必须先读 Stage 0.5 产出的测试文件
2. **RED 验证**：确认测试全部失败（预期状态）
3. **GREEN 实现**：写最小代码让测试通过，禁止超前实现
4. **微循环**：每次处理 1-3 个测试用例，通过后进入下一组
5. **禁止先实现后补测试**：检测到则删除代码重新从 RED 开始
6. **覆盖率保持**：重构时不得降低分支覆盖率
7. **`--no-tdd` 回退**：仅用于纯文档/非编码任务，必须说明原因

### SHARED PREFIX END — 缓存前缀结束

## 差异化内容（每个 agent 不同）
```

### 模板使用说明

1. `### SHARED PREFIX START` 到 `### SHARED PREFIX END` 之间的内容 MUST 在所有 agent 中逐字相同
2. 差异化内容（角色、阶段、任务描述）MUST 放在 `### SHARED PREFIX END` 之后
3. 前缀内容保持在 **300-500 token** 以内（当前模板约 280 token，预留弹性）
4. 若需要为特定 agent 增加共享指令（如模型路由、对齐工作流），追加到 `## 输出格式` 之后但仍在 `### SHARED PREFIX END` **之前**，确保所有 agent 同步添加
5. 修改共享前缀后，所有 agent 的缓存会同时失效——随后第一次请求是全新缓存填充，后续恢复命中
6. 建议修改前缀后先做一次预热再 spawn agent

