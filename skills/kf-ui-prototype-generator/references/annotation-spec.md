# Annotation Spec — 7-Layer Business Annotation System (暗门注释)

Every generated HTML prototype embeds a 7-layer annotation drawer. This spec defines each layer's purpose and content expectations.

## Layer Definitions

| Layer | Code | Name | Purpose | Content Type |
|-------|------|------|---------|--------------|
| L0 | `anno-tab-l0` | Page Overview | Page identity, module, business context | Summary paragraph |
| L1 | `anno-tab-l1` | Field Details | Per-field: source, validation rules, cascade logic, constraints | Structured list |
| L2 | `anno-tab-l2` | Business Rules | Calculation formulas, conditional logic, permission requirements | Rule table |
| L3 | `anno-tab-l3` | State Machine | Entity state transitions, trigger conditions, allowed actions | State diagram / table |
| L4 | `anno-tab-l4` | API Contracts | Endpoint, method, request/response shape, error codes | API spec table |
| L5 | `anno-tab-l5` | Performance Notes | Expected data volume, lazy-load points, cache strategy | Bullet list |
| L6 | `anno-tab-l6` | Open Questions | Unresolved decisions, TBD items, assumption flags | Question list |

## Per-Page-Type Layer Mapping

| Page Type | L0 | L0.ops | L0.deps | L1 | L1.perm | L1.constraints | L1.bounds | L2 | L2.exceptions | L3 | L4 | L5 | L6 |
|-----------|----|----|----|----|----|----|----|----|----|----|----|----|----|
| **List** | ✅ | ✅ | ○ | ✅ (search+table) | ○ | ○ | ✅ | ✅ | ○ | ○ (slim) | ✅ | ○ | ✅ |
| **Form** | ✅ | ✅ | ○ | ✅ (all fields) | ○ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| **Detail** | ✅ | ✅ | ○ | ✅ | ○ | ○ | ○ | ✅ | ○ | ✅ (full) | ✅ | ○ | ✅ |
| **Dashboard** | ✅ | ✅ | ✅ | ✅ (metrics) | ○ | — | ○ | ✅ | ○ | — | ✅ | ○ | ✅ |
| **Composite** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ = required, ○ = optional (include if PRD provides info), — = not applicable

## Missing Layer Handling

Missing layers MUST still have empty `anno-tab-content` containers to prevent JS errors:
```html
<div class="anno-tab-content" id="anno-tab-l3">
  <p class="anno-placeholder">本页面无状态机相关注释（列表页不涉及实体状态流转）</p>
</div>
```

## Content Rules

1. All example data MUST be fictional and marked `(示例)`
2. No PII, credentials, or internal IPs in annotation content
3. Field names use the same naming as in the HTML (camelCase or snake_case as appropriate)
4. API endpoints use placeholder paths: `/api/v1/{resource}`
5. Business rules reference PRD sections: `[PRD 4.2.1]`
6. Open questions use checkbox format: `- [ ] Is the discount applied before or after tax?`

## Badge Wiring

Each annotated element gets a badge:
```html
<span class="annotation-badge" data-anno-ref="1">1</span>
```

Badge numbering: sequential per-layer (L1 badges: 1, 2, 3...; L2 badges: 1, 2...). Badge click scrolls the drawer to the corresponding content.

---

## Extension Sub-Layers（扩展子层定义）

以下扩展子层用于补充基础七层体系中的细粒度业务定义缺失，解决 CRUD 显式定义、跨模块依赖、权限矩阵、字段约束、边界值、异常处理等问题。

### L0.ops — 操作定义

- **层级代号**：`L0.ops`
- **名称**：操作定义（Operations Definition）
- **定义**：页面支持的操作类型（增删改查、批量、导出等）与各操作的权限边界
- **解决问题**：CRUD 显式定义缺失
- **何时必填**：所有页面必填

**表格格式示例**：

| 操作 | 说明 | 可执行角色 | 备注 |
|------|------|------------|------|
| 新增 | 创建新记录 | Admin, Manager | 需填写所有必填字段 |
| 编辑 | 修改现有记录 | Admin, Manager | 仅限草稿状态 |
| 删除 | 软删除记录 | Admin | 需二次确认 |
| 批量导出 | 导出列表为 Excel | Admin, Manager, User | 最多导出 10000 条 |
| 查看 | 查看详情 | All | — |

---

### L0.deps — 业务关联

- **层级代号**：`L0.deps`
- **名称**：业务关联（Business Dependencies）
- **定义**：该页面与系统其他模块/实体的依赖与联动关系
- **解决问题**：跨模块依赖缺失
- **何时必填**：存在跨模块关联时必填

**内容结构**：
- **外部依赖**：依赖哪些模块的数据（如下拉选项来源、关联实体）
- **级联影响**：本页面操作如何影响其他模块（如删除订单级联取消支付）
- **页面跳转触发**：哪些操作会跳转到其他模块页面

**表格格式示例**：

| 关联模块 | 关联类型 | 关联说明 | 级联策略 |
|----------|----------|----------|----------|
| 用户管理 | 外部依赖 | 创建人/修改人字段引用用户表 | — |
| 支付模块 | 级联影响 | 取消订单时触发退款流程 | 异步通知 |
| 商品管理 | 页面跳转 | 点击商品名跳转商品详情 | — |

---

### L1.perm — 权限矩阵

- **层级代号**：`L1.perm`
- **名称**：权限矩阵（Permission Matrix）
- **定义**：角色 × 字段/操作 的可见性与可操作性矩阵
- **解决问题**：权限与可见性缺失
- **何时必填**：存在角色差异化访问时必填；所有角色行为相同则无需

**表格格式示例**：

| 字段/操作 | Admin | Manager | User | Guest |
|-----------|-------|---------|------|-------|
| 价格字段 | 可见/可编辑 | 可见/可编辑 | 可见/只读 | 不可见 |
| 成本字段 | 可见/可编辑 | 可见/只读 | 不可见 | 不可见 |
| 删除操作 | ✅ | ❌ | ❌ | ❌ |
| 审批操作 | ✅ | ✅ | ❌ | ❌ |

**值域说明**：可见/可编辑、可见/只读、不可见、✅（允许）、❌（禁止）

---

### L1.constraints — 字段约束表

- **层级代号**：`L1.constraints`
- **名称**：字段约束表（Field Constraints）
- **定义**：字段间的依赖关系、外键关系、级联规则、系统级约束
- **解决问题**：系统级约束缺失
- **何时必填**：存在外键、级联删除、系统约束（如全局唯一）时必填

**表格格式示例**：

| 字段 | 约束类型 | 约束规则 | 关联字段 |
|------|----------|----------|----------|
| order_id | 外键 | 引用 orders.id，级联删除 | orders.id |
| status | 枚举+依赖 | 值域依赖 type 字段 | type |
| amount | 范围 | 必须 > 0 且 ≤ credit_limit | credit_limit |
| code | 系统约束 | 全局唯一，不可修改 | — |
| updated_at | 自动 | 每次更新自动写入当前时间 | — |
| is_deleted | 软删除标记 | 0=正常，1=已删除 | — |

**约束类型枚举**：外键、枚举+依赖、范围、系统约束、自动、软删除标记

---

### L1.bounds — 边界值表

- **层级代号**：`L1.bounds`
- **名称**：边界值表（Boundary Values）
- **定义**：字段的数值范围（min/max）、最大长度、格式约束
- **解决问题**：边界值定义缺失
- **何时必填**：所有页面必填（所有数值类型必填 min/max，所有字符类型必填最大长度）

**表格格式示例**：

| 字段 | 类型 | 最小值 | 最大值 | 最大长度 | 格式 | 示例 |
|------|------|--------|--------|----------|------|------|
| name | string | — | — | 100 | — | 张三(示例) |
| age | number | 0 | 150 | — | — | 28 |
| email | string | — | — | 255 | `/^\S+@\S+$/` | test@example.com |
| price | decimal | 0.01 | 9999999.99 | — | 2位小数 | 199.00 |
| phone | string | — | — | 20 | `/^1[3-9]\d{9}$/` | 13800138000(示例) |

---

### L2.exceptions — 异常处理

- **层级代号**：`L2.exceptions`
- **名称**：异常处理（Exception Handling）
- **定义**：页面可能出现的异常场景、触发条件、系统响应、用户提示、恢复方案
- **解决问题**：异常场景缺失
- **何时必填**：推荐所有含交互操作的页面填写

**表格格式示例**：

| 异常场景 | 触发条件 | 系统响应 | 用户提示 | 恢复方案 |
|----------|----------|----------|----------|----------|
| 网络超时 | 请求 > 10s 无响应 | 中断请求 | "网络异常，请稍后重试" | 自动重试 1 次，失败后显示重试按钮 |
| 并发冲突 | 两人同时编辑同一记录 | 返回 409 | "该记录已被他人修改，请刷新" | 刷新页面获取最新数据 |
| 权限不足 | 用户角色无操作权限 | 返回 403 | "您无权执行此操作" | 隐藏无权限按钮，兜底拦截 |
| 数据不存在 | 记录已被删除或ID无效 | 返回 404 | "数据不存在或已被删除" | 返回列表页 |

---

## PRD 映射说明

注释层级与 PRD 章节存在明确的对应关系，便于原型与 PRD 交叉引用：

| 注释层级 | 对应 PRD 章节 | 说明 |
|----------|---------------|------|
| L0 | 1. 产品概述 / 2. 功能清单 | 页面定位、模块归属、业务场景 |
| L0.ops | 3. 功能详述 — 操作说明 | 各功能点支持的 CRUD 操作与权限 |
| L0.deps | 2. 功能清单 — 模块关系图 | 模块间依赖、数据流向 |
| L1 | 3. 功能详述 — 字段说明 | 字段定义、来源、校验规则 |
| L1.perm | 5. 权限设计 | 角色权限矩阵、可见性规则 |
| L1.constraints | 3. 功能详述 — 业务约束 | 外键关系、级联规则、系统约束 |
| L1.bounds | 3. 功能详述 — 字段说明(附表) | 边界值、长度限制、格式约束 |
| L2 | 4. 业务规则 | 计算公式、条件逻辑、触发规则 |
| L2.exceptions | 4. 业务规则 — 异常处理 | 异常场景、容错策略、降级方案 |
| L3 | 6. 状态流转 | 实体生命周期、状态机定义 |
| L4 | 7. 接口设计 | API 契约、请求响应结构 |
| L5 | 8. 非功能需求 — 性能 | 性能指标、缓存策略、懒加载 |
| L6 | 9. 待确认事项 | 开放问题、待决策项 |
