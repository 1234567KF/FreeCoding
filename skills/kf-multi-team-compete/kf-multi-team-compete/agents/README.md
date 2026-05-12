# /夯 子智能体定义（IDE 无关真源）

这是 5 个子智能体的**单一真源（Single Source of Truth）**，与任何 IDE 的目录约定解耦。

## 文件清单

| 文件 | 角色 | 用途 |
|------|------|------|
| `kf-hammer-red-team.md` | 红队 | 激进创新 Stage 0→5 |
| `kf-hammer-blue-team.md` | 蓝队 | 稳健工程 Stage 0→5 |
| `kf-hammer-green-team.md` | 绿队 | 安全保守 Stage 0→5 |
| `kf-hammer-judge.md` | 裁判 | 5 维加权评分 |
| `kf-hammer-adversary.md` | 对抗者 | 8 维魔鬼代言人 |

## 跨 IDE 分发规则

`install.ps1` / `install.sh` 会根据目标 IDE 把这些文件复制到对应位置：

| IDE | 目标路径 | 扩展名 | 使用方式 |
|-----|---------|--------|---------|
| **Qoder** | `.qoder/agents/` | `.md` | 作为 subagent，`Agent(subagent_type=...)` 真并发 |
| **Claude Code** | `.claude/agents/` | `.md` | 作为 subagent，`Task(subagent_type=...)` 真并发 |
| **Cursor** | `.cursor/rules/` | `.mdc` | 作为角色规则，串行角色切换 |
| **Trae** | `.trae/rules/` | `.md` | 作为角色规则，串行角色切换 |
| **Windsurf** | `.windsurf/rules/` | `.md` | 作为角色规则，串行角色切换 |

## 执行模式对照

| IDE | 执行模式 | 并发粒度 | UI |
|-----|---------|---------|----|
| Qoder / Claude Code | 真并发 | 跨队 3 路 | IDE 原生 Agent 调用卡片 |
| Cursor / Trae / Windsurf | 串行模拟 | 单会话角色切换 | 主会话文本输出 |

## 修改规则

**永远只改本目录下的真源**，然后重新运行 `install` 脚本同步到各 IDE 目录。直接改 `.qoder/agents/` 或 `.cursor/rules/` 等目录下的副本会在下次 install 时被覆盖。

## 核心设计约定（所有 5 个文件共用）

- **frontmatter**：`name` / `description` / `tools`（遵循 Qoder agent 规范，Claude Code 兼容）
- **共享前缀**：红/蓝/绿三队逐字相同的部分，支撑 DeepSeek KV 缓存命中
- **角色定位**：每个 agent 的唯一差异段
- **状态同步铁律**：统一通过 `hammer-bridge.cjs agent-spawn / agent-done / agent-fail`
- **Recording 模式**：不反问主会话，CRITICAL 级歧义记录到 notes 继续
- **结构化完成信号**：`DONE:{team}` + 产物清单 + 决策摘要，让 Qoder IDE 卡片摘要栏有用
