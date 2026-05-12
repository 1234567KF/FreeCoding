---
name: kf-doc-consistency
description: |
  Checks global document consistency across the project after a new skill is installed, modified, or removed. Verifies every skill reference, trigger word, directory tree listing, and calling chain is consistent across CLAUDE.md, 安装或更新/AICoding.md, INSTALL.md, and MANUAL.md.
  Triggers: "一致性", "文档自检", "文档检查", "全局检查", "同步检查", "doc consistency", "check docs", "自检", "全量同步检测".
metadata:
  pattern: pipeline + reviewer
  principle: 稳
  steps: "6"
  integrated-skills:
    - kf-model-router
  recommended_model: flash
graph:
  dependencies:
    - target: kf-model-router
      type: workflow  # 自动路由

---

# kf-doc-consistency — 文档全局一致性自检

> 每次新增/修改/删除技能后，执行此流水线确保所有文档引用一致。

执行前自动触发 kf-model-router 切换 flash 模型（省 token）。

---

## 流程概览

```
Stage 0 ─── Scout ─── 扫描磁盘技能目录，提取 SKILL.md frontmatter 元数据
Stage 1 ─── Check CLAUDE.md ─── 对比技能表 + 触发词表 + 目录树 + 调用链
Stage 2 ─── Check 安装或更新/AICoding.md ─── 对比详细技能表 + 调用链 + FAQ
Stage 3 ─── Check INSTALL.md + MANUAL.md ─── 对比触发词映射 + 目录树
Stage 4 ─── Auto-Fix ─── 按优先级自动修复所有 ERROR/WARNING
Stage 5 ─── Push ─── git add → commit → push，推完报告
```

---

## Stage 0 — Scout（侦察）

扫描 `{IDE_ROOT}/skills/` 下所有 SKILL.md，提取每个技能的元数据。

### 0a. 扫描技能目录

```bash
find {IDE_ROOT}/skills -name "SKILL.md" -maxdepth 3 | sort
```

对每个 SKILL.md，用 Read 读取 frontmatter，提取：
- `name` — 技能名称（kf-xxx）
- `description` — 注意 `Triggers:` 部分中的触发词列表
- `metadata.pattern` — 设计模式

### 0b. 构建 "事实源" 清单

格式：

```
| skill_name | trigger_words               | description_short |
|------------|-----------------------------|-------------------|
| kf-alignment | /对齐, 说下你的理解         | 对齐工作流        |
| kf-spec     | spec coding, 写spec文档     | Spec 驱动开发     |
```

Gate: 扫描完成且清单非空后进入 Stage 1。如 `{IDE_ROOT}/skills/` 为空，报告并终止。

---

## Stage 1 — Check CLAUDE.md

读取 `{IDE_CONFIG}`，对以下各节执行一致性检查。

### 1a. kf- 系列技能表

**定位**：`### kf- 系列（团队自建）` 后的 markdown 表格。

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中的 kf- 技能在表中没有对应行
- [ ] **STALE**（WARNING）：表中的技能在磁盘上不存在
- [ ] **DESCRIPTION_DRIFT**（INFO）：表中"说明"列与 SKILL.md description 明显不一致

每项检查记录：`{severity} | {doc} | {section} | {skill} | {detail}`

### 1b. 上游技能表

**定位**：`### 上游技能（非自建，不加 kf- 前缀）` 后的表格。

**检查项**：
- [ ] 非 kf- 技能（gspowers, gstack, markdown-to-docx-skill）在表中有无行
- [ ] 表中行对应的技能在磁盘上存在

### 1c. 常用触发词表

**定位**：`## 常用触发词` 后的表格。

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中每个技能至少有一个触发词在此表中
- [ ] **STALE**（WARNING）：表中的技能映射在磁盘上不存在
- [ ] **TRIGGER_DRIFT**（INFO）：触发词的文字表述与 SKILL.md description 中的 Triggers 部分不匹配

### 1d. 目录结构树

**定位**：`{IDE_ROOT}/` 目录树的 `└── skills/` 子节。

**检查项**：
- [ ] **MISSING**（ERROR）：磁盘上存在的 kf- 技能在目录树中没有列出
- [ ] **STALE**（WARNING）：目录树中列出的技能在磁盘上不存在（刚删除但未更新文档）

### 1e. 自动调用链速览

**定位**：`## 自动调用链速览` 后的 ASCII 图。

**检查项**：
- [ ] ASCII 图中引用的所有技能在磁盘上真实存在
- [ ] 对参与了 `/夯` 调用链的技能，图中是否有对应节点

### 1f. 安装或更新/README.md — 触发词表 + 目录树 + 第三方集成

**定位**：`安装或更新/README.md` 中 `## 功能触发词` 和 `## 目录结构` 和 `## 第三方开源集成` 三节。

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中的 kf- 技能在触发词表中没有对应行
- [ ] **MISSING_DIRTREE**（WARNING）：磁盘存在的 kf- 技能在 README 目录树中未列出
- [ ] **MISSING_CREDIT**（INFO）：第三方开源技能在集成表中未列出
- [ ] **STALE**（WARNING）：表中行引用的技能在磁盘上不存在

Gate: 1a~1f 均完成后进入 Stage 2。

---

## Stage 2 — Check 安装或更新/AICoding.md

读取 `安装或更新/AICoding.md`，对以下各节执行一致性检查。

### 2a. kf- 系列详细表

**定位**：`### kf- 系列（团队自建）` 后的表格（含 7 列：技能、别名、原则、调用类型、自动调用、被谁调用、模型）。

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中的 kf- 技能在表中没有对应行
- [ ] **STALE**（WARNING）：表中的行对应技能在磁盘上不存在
- [ ] **MODEL_DRIFT**（INFO）：表中"模型"列与 SKILL.md 中 `recommended_model` 不一致
- [ ] **DESCRIPTION_DRIFT**（INFO）：表中别名/描述与 SKILL.md frontmatter 不一致

### 2b. `/夯` 完整调用链

**定位**：`### 主入口 `/夯` 的完整调用链` 后的 ASCII 图。

**检查项**：
- [ ] ASCII 图中 `kf-xxx` 节点全部对应磁盘上真实存在的技能
- [ ] 无 Stale 引用（图中技能已被删除）

### 2c. 关键结论表

**定位**：`### 关键结论` 后的表格。

**检查项**：
- [ ] 表中引用的技能名称全部对应磁盘上真实存在的技能

Gate: 2a~2c 均完成后进入 Stage 3。

---

## Stage 3 — Check INSTALL.md + MANUAL.md

### 3a. INSTALL.md — 触发词映射

读取 `安装或更新/docs/INSTALL.md`，查找所有形如 `| \`<trigger>\` | <description> | kf-xxx |` 的行。

用 Grep 抽取：
```bash
grep -n '| `.*` |.*| kf-' 安装或更新/docs/INSTALL.md
```

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中的 kf- 技能没有一个对应的 INSTALL 触发词行
- [ ] **STALE**（WARNING）：INSTALL 中引用的 kf- 技能在磁盘上不存在
- [ ] **TRIGGER_DRIFT**（INFO）：触发词文字与 CLAUDE.md 触发词表不一致

### 3b. MANUAL.md — 功能触发速查表

**定位**：`## 四、功能触发速查` 后的表格（第 3 列为技能来源）。

**检查项**：
- [ ] **MISSING**（ERROR）：事实源中的 kf- 技能没有触发词行
- [ ] **STALE**（WARNING）：表中行引用的技能在磁盘上不存在
- [ ] **TRIGGER_DRIFT**（INFO）：触发词与事实源不一致

### 3c. MANUAL.md — 目录结构树

**定位**：MANUAL.md 中项目本地 skills 目录树（`── skills/` 子节）。

**检查项**：
- [ ] **MISSING**（ERROR）：磁盘存在的 kf- 技能在目录树中未列出
- [ ] **STALE**（WARNING）：目录树中列出的 kf- 技能在磁盘上不存在
- [ ] **ORDER_DRIFT**（INFO）：目录树中技能顺序与磁盘实际字母序不一致

Gate: 3a~3c 均完成后进入 Stage 4。

---

## Stage 4 — Auto-Fix（自动修复）

汇总所有 stages 发现的 findings，按优先级逐条自动修复。

### 4a. 修复优先级

1. **P0 — ERROR**：所有 MUST 级问题（MISSING、STALE），逐条修复
2. **P1 — WARNING**：所有 SHOULD 级问题（DESCRIPTION_DRIFT、TRIGGER_DRIFT、MODEL_DRIFT、ORDER_DRIFT），逐条修复
3. **跳过 INFO**：记录但不动

### 4b. 修复规则

每个 finding 按类型执行对应修复：

| 类型 | 文档 | 修复动作 |
|------|------|----------|
| MISSING | 技能表/触发词表 | 用 Edit 在对应表格末尾追加行 |
| STALE | 任意文档 | 用 Edit 删除对应行/引用 |
| DESCRIPTION_DRIFT | 说明列与 SKILL.md 不一致 | 用 Edit 更新说明文字 |
| TRIGGER_DRIFT | 触发词文字不匹配 | 用 Edit 更新触发词 |
| MODEL_DRIFT | 模型列与 recommended_model 不符 | 用 Edit 更新模型列 |
| ORDER_DRIFT | MANUAL 目录树顺序 | 用 Edit 重排序节点 |
| MISSING_DIRTREE | README 目录树 | 用 Edit 在目录树中追加 |
| MISSING_CREDIT | README 第三方集成表 | 用 Edit 在表末尾追加 |

对每个 finding 顺序执行：
1. 用 Edit 修复
2. 输出 `[FIXED] {severity} | {doc} | {section} | {skill} → {action_taken}`
3. 继续下一条

所有 P0+P1 修复完成后，输出一份简短汇总：

```
───────────────── Auto-Fix Summary ─────────────────
P0 ERROR fixed: {count}
P1 WARNING fixed: {count}
INFO (skipped):  {count}
Unfixable:        {count}（如下）
  - {reason} | {finding}
─────────────────────────────────────────────────
```

### 4c. Unfixable 情况

以下情况无法自动修复，输出到汇总中请用户手动处理：
- PNG 海报需重截（始终提示）
- 需要人工判断的描述性内容（如技能描述措辞用户可能有偏好的）

### 4d. PNG 海报提醒

文档修复不覆盖 PNG 图片。如果本次修复涉及技能增删，完成后提醒：

> 技能有增减，请手动重截海报：打开 `安装或更新/assets/posters/宣传海报_浅色.html` → 截图 → 覆盖 `宣传海报_浅色.png`

---

## Stage 5 — Push（提交推库）

如果有任何文件被修改（通过 Edit 工具），执行：

### 5a. 暂存所有变更

```bash
git add -A
```

### 5b. 提交

```bash
git commit -m "docs: 文档一致性自动修复"
```

### 5c. 推送

```bash
git push origin main
```

### 5d. 输出结果

推送完成后输出：

```
✅ 文档一致性自动修复完成
- 修复文件数：{N}
- 修复项：{P0 个 ERROR + P1 个 WARNING}
- 已推送到 origin/main
```

如果没有任何变更（全部干净），跳过 Stage 5，输出：

```
✅ 全绿通过，无需修复
```

---

## 触发方式

### 方式 1：kf-add-skill 触发（自动）

`kf-add-skill` 在 Step 7（最终验证）中自动调用本技能。

### 方式 2：用户手动触发

用户说"做文档一致性检查"或"自检"等触发词时手动调用。
