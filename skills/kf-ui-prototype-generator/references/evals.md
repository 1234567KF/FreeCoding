# Evals for kf-ui-prototype-generator

## Positive (Skill SHOULD load)

| # | User Query | Expected | Notes |
|---|-----------|----------|-------|
| 1 | "帮我生成一个营销码管理列表页原型" | YES | Core trigger: 原型 + 列表页 |
| 2 | "根据这个 PRD 生成用户管理页面的 HTML 原型" | YES | PRD → prototype flow |
| 3 | "UI原型：订单详情页" | YES | 中文 trigger "UI原型" |
| 4 | "prototype a dashboard for sales metrics" | YES | English trigger "prototype" |
| 5 | "生成页面原型，包含表单和表格" | YES | 页面原型 trigger |
| 6 | "用暗门注释生成这个页面的原型" | YES | 暗门注释 trigger |
| 7 | "把这个 PRD 转成可交互的 HTML 原型" | YES | PRD→HTML flow |

## Negative (Skill should NOT load)

| # | User Query | Expected | Notes |
|---|-----------|----------|-------|
| 8 | "帮我写一个 Vue 组件" | NO | Vue component, not HTML prototype |
| 9 | "用 Tailwind 重构这个页面" | NO | CSS refactoring, not prototype generation |
| 10 | "这个 Figma 设计转成代码" | NO | Design→code, different domain |
| 11 | "修复页面上的 bug" | NO | Bug fix, not generation |
| 12 | "写一个 React hooks" | NO | React development, not HTML prototype |
| 13 | "优化网站的 SEO" | NO | SEO optimization, unrelated |
| 14 | "部署这个前端项目" | NO | Deployment, not generation |

## Eval Execution

To verify the Skill loads correctly:
1. Run each positive query — Skill should activate
2. Run each negative query — Skill should NOT activate
3. Check that false positives don't degrade other skills' routing
