---
name: kf-ui-prototype-generator
description: >-
  Load when user wants to generate zero-dependency HTML UI prototypes from PRD
  documents with embedded 暗门注释 (7-layer business annotation system with L0-L6
  tab navigation in a resizable drawer). Triggers: "生成原型", "UI原型", "页面原型",
  "HTML原型", "prototype", "原型生成", "暗门注释", "页面 mockup".
metadata:
  pattern: generator + pipeline
  domain: ui-prototype
integrated-skills:
  - kf-alignment
recommended_model: flash
graph:
  dependencies:
    - target: kf-alignment
      type: workflow
---

# UI Prototype Generator — Annotation-Driven HTML Prototypes

> Zero external dependencies. One clean design system. Every prototype embeds a 7-layer annotation drawer with L0-L6 tab navigation — developers and testers have zero remaining questions.

Generate high-fidelity HTML prototypes from PRD documents. Every generated HTML ships with a **built-in annotation drawer** — Ctrl+B to toggle a resizable right-side panel with L0-L6 tabbed annotations.

---

## Architecture Overview

```
Phase 0: Intake          Phase 1: Build            Phase 1.5: Annotate    Phase 2: Verify
─────────────────────     ──────────────────────   ────────────────────   ─────────────────
Collect Inputs       →    CSS Variable Injection    Load Annotation Spec   Self-Check
Project Detect            HTML Skeleton + CSS       Generate 7-Layer Ann.  Quality Review
PRD Parse                 Interaction Layer         Embed Tab Drawer UI    Harness Gate
Component Decision        Responsive Breakpoints    Wire Badge Anchors     Auto-Repair
    │                             │                       │                       │
    └───── Gate 1 ───────────────┴────── Gate 1.5 ────────┴────── Gate 2 ─────────┘
```

---

## Phase 0 — Intake

### Step 0.1 — Collect Required Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| PRD document | Yes | Reference via `@file` |
| Prototype mode | optional | **Single-page** (default) or **Multi-page** |
| Dev scenario | optional | **New project** (default) or **Iteration** |
| Page name | Yes | Target page name |
| Page list | optional | Multi-page only. Auto-detect from PRD if omitted |
| Output path | optional | Relative to workspace root, e.g. `prototypes/` |
| Page type | optional | List / Form / Detail / Dashboard / Composite |
| Device target | optional | **web** (default) or **mobile** |

### Step 0.2 — Project Context Detection

1. Search for page-level component files (`.vue`, `.tsx`, `.jsx`, etc.)
2. Reference framework config files (`vite.config.*`, `next.config.*`)
3. Identify route configuration files for page directory locations

- **Detected** → Context-Aware Mode: generate based on existing page style
- **Not detected** → Ask: "No project page directory detected. Is this for an actual project?"
  - User provides directory → Context-Aware Mode
  - User says "standalone" → Standalone Mode

### Step 0.3 — Parse PRD

**Context-Aware Mode:** Scan project page directory — if page exists, renovation mode (only modify what PRD changes). If new page, scan similar pages for layout conventions.

**Standalone Mode:** Generate from default template.

### Step 0.4 — Component Decision Matrix

Match PRD semantics to HTML components:

| Intent \ Data Shape | Single Value | List / Array | Hierarchical | Rich Content |
|---------------------|-------------|--------------|--------------|--------------|
| Input / Create | Input / Select / DatePicker | Checkbox.Group / Transfer | TreeSelect / Cascader | Editor / Upload |
| Display / Read | Text / Badge / Tag | Table / List / Card.Grid | Tree / Collapse | Descriptions / Card |
| Action / Trigger | Button / Link | Dropdown.Button | Menu | Modal.confirm / Drawer |
| Filter / Query | Input.Search / Select | DatePicker.RangePicker | TreeSelect | — |
| Navigate | Breadcrumb | Tabs / Steps | Menu / Pagination | Layout / Space |
| Feedback | Tooltip / Popover | — | — | Modal / Drawer / Alert |

Map to semantic CSS classes: `.ui-table`, `.ui-btn`, `.ui-card`, `.ui-modal`, `.ui-form`, `.ui-input`, `.ui-select`, `.ui-tag`, `.ui-badge`, `.ui-menu`, `.ui-tabs`, `.ui-breadcrumb`, `.ui-pagination`, `.ui-alert`.

### Gate 1

> Do not enter Phase 1 until all required parameters collected, project context detected, and PRD parsed.

---

## Phase 1 — Build

### Step 1.1 — CSS Variable Injection

Copy the `:root {}` block from `references/css-variables.md` into every `<style>` block. All components reference only `var(--primary)`, `var(--text)`, etc. — no hardcoded colors.

### Step 1.2 — Generate HTML Skeleton

Structure:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{page_title}}</title>
  <style>
    /* Layer 1: CSS Variables — from references/css-variables.md */
    /* Layer 2: Skeleton CSS — from references/skeleton-css.md */
    /* Layer 3: Responsive breakpoints */
    /* Layer 4: Annotation Drawer — from references/anno-drawer-template.md */
  </style>
</head>
<body>
  {{page_content}}
  {{annotation_drawer}}
</body>
</html>
```

#### Generation Rules

**Responsive strategy** (device-aware):
- **web target**: Desktop-first. Sidebar ≥992px, collapses <768px. Tables full columns on desktop, card view on mobile.
- **mobile target**: Mobile-first. Bottom tab nav. Full-width cards. Touch targets ≥44px. Single-column layouts.

**Real data (no empty tables):**
- 5-8 rows of realistic demo data with varied states (normal, disabled, pending, at least 3 tag colors)
- Timestamps with realistic dates, not "2024-01-01"
- Pre-fill search fields with example values
- Empty state only shown via toggle, not default

**All buttons must be functional:**
- Every button triggers a modal, navigation, toggle, or submission
- Table action buttons (view/edit/delete) each open distinct modals
- Buttons with no defined action: create confirmation modal "This feature is not yet implemented"

**Four mandatory state views:**
1. Data state (default) — real content
2. Empty state — `.ui-empty` with guidance, triggerable via checkbox
3. Loading state — skeleton shimmer animation, triggerable via checkbox
4. Error state — error alert + retry button, triggerable via checkbox

**Iteration scenario:** Only modify what PRD explicitly changes. Preserve unchanged areas. Annotate: `<!-- [新增] -->` / `<!-- [变更] -->`.

**Multi-page mode:** Create directory by menu module. Generate `shared.css` first. Output sidebar HTML once. `index.html` = lightweight shell only. Inter-page links via `<a href>`.

### Step 1.3 — Interaction Simulation (CSS-Only)

Use CSS checkbox/radio hacks for all interactions (except annotation drawer JS). Full patterns in `references/interaction-patterns.md`.

Quick reference:
| Interaction | Technique |
|-------------|-----------|
| Modal | `input[type=checkbox]:checked ~ .modal-overlay { display: flex; }` |
| Tabs | `input[type=radio]:checked ~ .tab-panel-n { display: block; }` |
| Alert dismiss | Checkbox + `:checked + .ui-alert { display: none; }` |

### Step 1.5 — Source Traceability

Add inline comments:
- `<!-- PRD: 4.1 -->` — maps to PRD sections
- `<!-- [新增] -->` / `<!-- [变更] -->` — iteration markers
- `<!-- TODO: 确认筛选条件枚举值 -->` — unresolved decisions

---

## Phase 1.5 — Annotation Injection (暗门注释)

### Step 1.5.1 — Load Annotation Spec

Load `references/annotation-spec.md` for the 7-layer structure and per-page-type customization strategy.

### Step 1.5.2 — Generate Annotation Content

Per page-type layer mapping:

| Page Type | Core Layers | Optional |
|-----------|-------------|----------|
| **List** | L0, L1(search+table), L2, L4, L6 | L3(slim), L5 |
| **Form** | L0, L1(all fields+cascade+validation), L2, L4, L6 | L3(—), L5(—) |
| **Detail** | L0, L1, L2, L3(full), L4, L6 | L5 |
| **Dashboard** | L0, L1(metrics), L2, L4, L6 | L3(—), L5 |
| **Composite** | All 7 layers, content tabbed by region | — |

Missing layers MUST still have empty `anno-tab-content` containers (prevents JS errors). Use placeholder text: "本页面无状态机相关注释（{{页面类型}}不涉及实体状态流转）".

All example data MUST be fictional and marked `(示例)`. No PII, credentials, or internal IPs.

### Step 1.5.3 — Wire Annotation Badges

```html
<span class="annotation-badge" data-anno-ref="1">1</span>
```

Parent elements with badges MUST have class `has-annotation` (for `position: relative`).

### Step 1.5.4 — Embed Drawer Component

Load the complete drawer HTML/CSS/JS from `references/anno-drawer-template.md`. All 7 tab containers (`anno-tab-l0` through `anno-tab-l6`) must be present even if some layers are empty.

### Gate 1.5

> Do not enter Phase 2 until annotation content generated for all required layers and drawer component embedded.

---

## Phase 2 — Verify

### Step 2.1 — Self-Check

- [ ] Opens in browser without errors (no CDN, no broken references)
- [ ] CSS variables used everywhere (no hardcoded colors)
- [ ] All buttons trigger actions — no dead buttons
- [ ] Four state views present and triggerable
- [ ] 5-8 rows realistic data with varied statuses
- [ ] Annotation drawer: Ctrl+B toggles, Escape closes, resizable
- [ ] L0-L6 tabs present and switching correctly
- [ ] Badges hidden when drawer closed, visible when open
- [ ] No real PII/credentials in annotation examples

### Step 2.2 — Quality Review

Two-dimensional review:
- **Component Correctness**: Components match PRD semantics, `.ui-*` naming
- **Requirement Consistency**: All PRD fields reflected in search/table/form/detail
- **Annotation Completeness**: All required layers populated, badges wired, drawer functional

### Gate 2

> Do not deliver until self-check and quality review both pass.

Verification: `harness-gate-check.cjs --skill kf-ui-prototype-generator --stage step7 --required-sections "原型质量审查报告" --forbidden-patterns "❌"`

---

---

## Appendix A: Complete Theme CSS Libraries

Copy these verbatim into the `<style>` block of every generated prototype. All 6 themes share the same variable names — switching class on `<html>` instantly re-themes the page.

### How To Use

```css
/* In generated HTML <style>:
   1. Copy :root block (defaults = Ant Design)
   2. Copy .theme-antd block (same values as :root, for explicit switching)
   3. Copy .theme-element, .theme-arco, .theme-semi, .theme-tdesign, .theme-none
   4. The theme switcher JS sets document.documentElement.className to one of these
*/
```

### A.1 Ant Design (Default)

Origin: Ant Group / Alibaba | Primary: #1890ff | Class: `theme-antd`

```css
:root,
.theme-antd {
  /* ── Brand Colors ── */
  --primary: #1890ff;
  --primary-hover: #40a9ff;
  --primary-active: #096dd9;
  --primary-bg: #e6f7ff;

  /* ── Functional Colors ── */
  --success: #52c41a;
  --success-bg: #f6ffed;
  --warning: #faad14;
  --warning-bg: #fffbe6;
  --error: #ff4d4f;
  --error-bg: #fff2f0;
  --info: #1890ff;
  --info-bg: #e6f7ff;

  /* ── Neutral Colors ── */
  --text: rgba(0, 0, 0, 0.85);
  --text-secondary: rgba(0, 0, 0, 0.65);
  --text-tertiary: rgba(0, 0, 0, 0.45);
  --text-disabled: rgba(0, 0, 0, 0.25);
  --border: #d9d9d9;
  --border-light: #f0f0f0;
  --bg: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(0, 0, 0, 0.45);
  --link: #1890ff;
  --link-hover: #40a9ff;

  /* ── Typography ── */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  --font-size-h1: 38px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.5715;
  --line-height-heading: 1.35;

  /* ── Spacing ── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* ── Border Radius ── */
  --radius-xs: 2px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-round: 32px;
  --radius-circle: 50%;

  /* ── Shadow ── */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  --shadow-md: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 6px 16px -8px rgba(0, 0, 0, 0.08), 0 9px 28px 0 rgba(0, 0, 0, 0.05), 0 12px 48px 16px rgba(0, 0, 0, 0.03);
  --shadow-xl: 0 8px 20px rgba(0, 0, 0, 0.06);

  /* ── Breakpoints (used in @media queries) ── */
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;

  /* ── Transition ── */
  --transition-duration: 0.2s;
  --transition-easing: cubic-bezier(0.645, 0.045, 0.355, 1);

  /* ── Layout ── */
  --header-height: 48px;
  --sidebar-width: 200px;
  --sidebar-collapsed-width: 80px;
  --content-max-width: 1200px;
}
```

### A.2 Element Plus

Origin: Ele.me | Primary: #409eff | Class: `theme-element`

```css
.theme-element {
  --primary: #409eff;
  --primary-hover: #66b1ff;
  --primary-active: #3a8ee6;
  --primary-bg: #ecf5ff;
  --success: #67c23a;
  --success-bg: #f0f9eb;
  --warning: #e6a23c;
  --warning-bg: #fdf6ec;
  --error: #f56c6c;
  --error-bg: #fef0f0;
  --info: #909399;
  --info-bg: #f4f4f5;
  --text: #303133;
  --text-secondary: #606266;
  --text-tertiary: #909399;
  --text-disabled: #c0c4cc;
  --border: #dcdfe6;
  --border-light: #e4e7ed;
  --bg: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-tertiary: #f2f6fc;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(0, 0, 0, 0.3);
  --link: #409eff;
  --link-hover: #66b1ff;
  --font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 20px;
  --font-size-3xl: 24px;
  --font-size-h1: 28px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.5;
  --line-height-heading: 1.4;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 20px;
  --spacing-xl: 30px;
  --spacing-2xl: 40px;
  --radius-xs: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-round: 20px;
  --radius-circle: 50%;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 16px 0 rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 8px 24px 0 rgba(0, 0, 0, 0.16);
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;
  --transition-duration: 0.25s;
  --transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --header-height: 50px;
  --sidebar-width: 200px;
  --sidebar-collapsed-width: 64px;
  --content-max-width: 1200px;
}
```

### A.3 Arco Design

Origin: ByteDance | Primary: #165dff | Class: `theme-arco`

```css
.theme-arco {
  --primary: #165dff;
  --primary-hover: #4080ff;
  --primary-active: #0e42d2;
  --primary-bg: #e8f1ff;
  --success: #00b42a;
  --success-bg: #e8ffea;
  --warning: #ff7d00;
  --warning-bg: #fff7e8;
  --error: #f53f3f;
  --error-bg: #ffece8;
  --info: #165dff;
  --info-bg: #e8f1ff;
  --text: #1d2129;
  --text-secondary: #4e5969;
  --text-tertiary: #86909c;
  --text-disabled: #c9cdd4;
  --border: #e5e6eb;
  --border-light: #f2f3f5;
  --bg: #ffffff;
  --bg-secondary: #f7f8fa;
  --bg-tertiary: #f2f3f5;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(29, 33, 41, 0.6);
  --link: #165dff;
  --link-hover: #4080ff;
  --font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-family-mono: 'Source Code Pro', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 22px;
  --font-size-3xl: 28px;
  --font-size-h1: 36px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.5715;
  --line-height-heading: 1.3;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --radius-xs: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-round: 22px;
  --radius-circle: 50%;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.10);
  --shadow-xl: 0 12px 40px rgba(0, 0, 0, 0.14);
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;
  --transition-duration: 0.2s;
  --transition-easing: cubic-bezier(0, 0, 1, 1);
  --header-height: 48px;
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 48px;
  --content-max-width: 1200px;
}
```

### A.4 Semi Design

Origin: ByteDance / TikTok | Primary: #0077fa | Class: `theme-semi`

```css
.theme-semi {
  --primary: #0077fa;
  --primary-hover: #3399ff;
  --primary-active: #0059d9;
  --primary-bg: #e8f4ff;
  --success: #00b42a;
  --success-bg: #e8ffea;
  --warning: #ff7d00;
  --warning-bg: #fff7e8;
  --error: #f53f3f;
  --error-bg: #ffece8;
  --info: #0077fa;
  --info-bg: #e8f4ff;
  --text: rgba(0, 0, 0, 0.85);
  --text-secondary: rgba(0, 0, 0, 0.62);
  --text-tertiary: rgba(0, 0, 0, 0.38);
  --text-disabled: rgba(0, 0, 0, 0.20);
  --border: rgba(0, 0, 0, 0.12);
  --border-light: rgba(0, 0, 0, 0.06);
  --bg: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #fafafa;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(0, 0, 0, 0.45);
  --link: #0077fa;
  --link-hover: #3399ff;
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 22px;
  --font-size-3xl: 26px;
  --font-size-h1: 32px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.6;
  --line-height-heading: 1.3;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --radius-xs: 2px;
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-lg: 12px;
  --radius-round: 30px;
  --radius-circle: 50%;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.08), 0 2px 4px 0 rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px 0 rgba(0, 0, 0, 0.10), 0 4px 8px 0 rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 16px 40px 0 rgba(0, 0, 0, 0.12), 0 8px 16px 0 rgba(0, 0, 0, 0.08);
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;
  --transition-duration: 0.2s;
  --transition-easing: cubic-bezier(0.4, 0.14, 0.3, 1);
  --header-height: 48px;
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 60px;
  --content-max-width: 1200px;
}
```

### A.5 TDesign

Origin: Tencent | Primary: #0052d9 | Class: `theme-tdesign`

```css
.theme-tdesign {
  --primary: #0052d9;
  --primary-hover: #366ef4;
  --primary-active: #0043b3;
  --primary-bg: #e8f3ff;
  --success: #00a870;
  --success-bg: #e8f8f2;
  --warning: #e37318;
  --warning-bg: #fef3e6;
  --error: #e34d59;
  --error-bg: #fef0ef;
  --info: #0052d9;
  --info-bg: #e8f3ff;
  --text: #1a1a22;
  --text-secondary: #5a5a62;
  --text-tertiary: #8a8a92;
  --text-disabled: #c0c0c8;
  --border: #d0d0d8;
  --border-light: #e8e8ec;
  --bg: #ffffff;
  --bg-secondary: #f5f5f8;
  --bg-tertiary: #eef0f4;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(0, 0, 0, 0.4);
  --link: #0052d9;
  --link-hover: #366ef4;
  --font-family: 'PingFang SC', 'Microsoft YaHei', Arial, 'Helvetica Neue', sans-serif;
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, 'Courier New', monospace;
  --font-size-xs: 12px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 28px;
  --font-size-h1: 36px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.5;
  --line-height-heading: 1.3;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --radius-xs: 1px;
  --radius-sm: 3px;
  --radius-md: 6px;
  --radius-lg: 12px;
  --radius-round: 24px;
  --radius-circle: 50%;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 8px 20px 0 rgba(0, 0, 0, 0.10), 0 2px 4px 0 rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 16px 40px 0 rgba(0, 0, 0, 0.12), 0 4px 8px 0 rgba(0, 0, 0, 0.06);
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;
  --transition-duration: 0.25s;
  --transition-easing: cubic-bezier(0.38, 0, 0.24, 1);
  --header-height: 48px;
  --sidebar-width: 208px;
  --sidebar-collapsed-width: 56px;
  --content-max-width: 1200px;
}
```

### A.6 Built-in (Generic)

Origin: None | Primary: #1677ff | Class: `theme-none`

```css
.theme-none {
  --primary: #1677ff;
  --primary-hover: #4096ff;
  --primary-active: #0958d9;
  --primary-bg: #e6f4ff;
  --success: #52c41a;
  --success-bg: #f6ffed;
  --warning: #faad14;
  --warning-bg: #fffbe6;
  --error: #ff4d4f;
  --error-bg: #fff2f0;
  --info: #1677ff;
  --info-bg: #e6f4ff;
  --text: #1f1f1f;
  --text-secondary: #5e5e5e;
  --text-tertiary: #9e9e9e;
  --text-disabled: #c0c0c0;
  --border: #d9d9d9;
  --border-light: #f0f0f0;
  --bg: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --bg-elevated: #ffffff;
  --bg-mask: rgba(0, 0, 0, 0.45);
  --link: #1677ff;
  --link-hover: #4096ff;
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 28px;
  --font-size-h1: 32px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height: 1.6;
  --line-height-heading: 1.35;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-round: 32px;
  --radius-circle: 50%;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 20px 0 rgba(0, 0, 0, 0.10);
  --shadow-xl: 0 12px 40px 0 rgba(0, 0, 0, 0.14);
  --breakpoint-xs: 480px;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-xxl: 1600px;
  --transition-duration: 0.2s;
  --transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --header-height: 48px;
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 64px;
  --content-max-width: 1200px;
}
```

---

## Appendix B: Responsive Skeleton CSS

This is theme-agnostic — references only `var()` values.

```css
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: var(--font-size-base); }
body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

/* ── Layout ── */
.ui-layout { display: flex; min-height: 100vh; }
.ui-layout-sider { width: var(--sidebar-width); background: var(--bg-elevated); border-right: 1px solid var(--border); flex-shrink: 0; }
.ui-layout-content { flex: 1; padding: var(--spacing-lg); max-width: var(--content-max-width); }
.ui-layout-header { height: var(--header-height); display: flex; align-items: center; padding: 0 var(--spacing-lg); border-bottom: 1px solid var(--border); background: var(--bg-elevated); }

/* ── Card ── */
.ui-card { background: var(--bg-elevated); border-radius: var(--radius-md); border: 1px solid var(--border); padding: var(--spacing-lg); }
.ui-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md); font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); }

/* ── Button ── */
.ui-btn { display: inline-flex; align-items: center; justify-content: center; height: 32px; padding: 0 var(--spacing-md); font-size: var(--font-size-base); font-family: var(--font-family); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-duration) var(--transition-easing); background: var(--bg); color: var(--text); gap: var(--spacing-xs); }
.ui-btn:hover { border-color: var(--primary); color: var(--primary); }
.ui-btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.ui-btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); color: #fff; }
.ui-btn-danger { color: var(--error); border-color: var(--error); }
.ui-btn-danger:hover { background: var(--error); color: #fff; }
.ui-btn-sm { height: 24px; padding: 0 var(--spacing-sm); font-size: var(--font-size-sm); }
.ui-btn-lg { height: 40px; padding: 0 var(--spacing-lg); font-size: var(--font-size-lg); }
.ui-btn-loading { opacity: 0.65; pointer-events: none; }
.ui-btn-loading::after { content: ''; width: 12px; height: 12px; border: 2px solid currentColor; border-top-color: transparent; border-radius: var(--radius-circle); animation: spin 0.6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.ui-btn-disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

/* ── Input ── */
.ui-input { width: 100%; height: 32px; padding: 0 var(--spacing-sm); font-size: var(--font-size-base); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); background: var(--bg); font-family: var(--font-family); transition: border-color var(--transition-duration); outline: none; }
.ui-input:hover { border-color: var(--primary); }
.ui-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-bg); }
.ui-input::placeholder { color: var(--text-tertiary); }

/* ── Select ── */
.ui-select { width: 100%; height: 32px; padding: 0 var(--spacing-sm); font-size: var(--font-size-base); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); background: var(--bg); font-family: var(--font-family); cursor: pointer; outline: none; }

/* ── Table ── */
.ui-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
.ui-table th { padding: var(--spacing-sm) var(--spacing-md); text-align: left; font-weight: var(--font-weight-semibold); color: var(--text); background: var(--bg-secondary); border-bottom: 1px solid var(--border); white-space: nowrap; }
.ui-table td { padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border-light); color: var(--text); }
.ui-table tbody tr:hover { background: var(--bg-secondary); }

/* ── Tag ── */
.ui-tag { display: inline-flex; align-items: center; padding: 0 var(--spacing-xs); height: 22px; font-size: var(--font-size-xs); border-radius: var(--radius-xs); line-height: 22px; }
.ui-tag-default { background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border); }
.ui-tag-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
.ui-tag-warning { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); }
.ui-tag-error { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }
.ui-tag-info { background: var(--primary-bg); color: var(--primary); border: 1px solid var(--primary); }

/* ── Alert ── */
.ui-alert { padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-sm); font-size: var(--font-size-sm); display: flex; align-items: center; gap: var(--spacing-sm); }
.ui-alert-info { background: var(--info-bg); color: var(--primary); border: 1px solid var(--primary); }
.ui-alert-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }
.ui-alert-warning { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); }
.ui-alert-error { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }

/* ── Breadcrumb ── */
.ui-breadcrumb { display: flex; align-items: center; gap: var(--spacing-xs); font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-md); }
.ui-breadcrumb a { color: var(--text-secondary); text-decoration: none; }
.ui-breadcrumb a:hover { color: var(--primary); }
.ui-breadcrumb .separator { color: var(--text-tertiary); }

/* ── Pagination ── */
.ui-pagination { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-xs); padding: var(--spacing-md) 0; font-size: var(--font-size-sm); }
.ui-pagination .page-item { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; background: var(--bg); color: var(--text); }
.ui-pagination .page-item:hover { color: var(--primary); border-color: var(--primary); }
.ui-pagination .page-item.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.ui-pagination .page-item.disabled { color: var(--text-disabled); cursor: not-allowed; }

/* ── Modal ── */
.ui-modal-overlay { display: none; position: fixed; inset: 0; background: var(--bg-mask); z-index: 1000; align-items: center; justify-content: center; }
.ui-modal { background: var(--bg-elevated); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); min-width: 420px; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.ui-modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md) var(--spacing-lg); border-bottom: 1px solid var(--border); font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); }
.ui-modal-body { padding: var(--spacing-lg); }
.ui-modal-footer { display: flex; justify-content: flex-end; gap: var(--spacing-sm); padding: var(--spacing-md) var(--spacing-lg); border-top: 1px solid var(--border); }
.ui-modal-close { cursor: pointer; font-size: 20px; line-height: 1; color: var(--text-secondary); background: none; border: none; }
.ui-modal-close:hover { color: var(--text); }

/* ── Form ── */
.ui-form-item { margin-bottom: var(--spacing-md); }
.ui-form-label { display: block; margin-bottom: var(--spacing-xs); font-size: var(--font-size-base); color: var(--text); font-weight: var(--font-weight-medium); }
.ui-form-label.required::after { content: ' *'; color: var(--error); }
.ui-form-help { margin-top: var(--spacing-xs); font-size: var(--font-size-xs); color: var(--text-tertiary); }
.ui-form-error .ui-input { border-color: var(--error); }
.ui-form-error .ui-form-help { color: var(--error); }

/* ── Empty State ── */
.ui-empty { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-2xl); color: var(--text-tertiary); font-size: var(--font-size-sm); }

/* ── Search Area ── */
.ui-search-area { margin-bottom: var(--spacing-md); padding: var(--spacing-md); background: var(--bg-secondary); border-radius: var(--radius-md); }
.ui-search-row { display: flex; gap: var(--spacing-md); flex-wrap: wrap; align-items: flex-end; }
.ui-search-item { display: flex; flex-direction: column; gap: var(--spacing-xs); min-width: 180px; }
.ui-search-item label { font-size: var(--font-size-sm); color: var(--text-secondary); }
.ui-search-actions { display: flex; gap: var(--spacing-sm); align-items: flex-end; }

/* ── Tabs ── */
.ui-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: var(--spacing-md); }
.ui-tab { padding: var(--spacing-sm) var(--spacing-md); cursor: pointer; border-bottom: 2px solid transparent; color: var(--text-secondary); font-size: var(--font-size-base); transition: all var(--transition-duration); }
.ui-tab:hover { color: var(--primary); }
.ui-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

/* ── State Switching ── */
.state-radio { display: none; }
.state-indicators { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); }
.state-indicators label {
  padding: var(--spacing-xs) var(--spacing-sm); font-size: var(--font-size-xs);
  border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;
  background: var(--bg); color: var(--text-secondary); transition: all var(--transition-duration);
}
.state-indicators label:hover { border-color: var(--primary); color: var(--primary); }
#state-data:checked ~ .state-indicators label[for="state-data"],
#state-empty:checked ~ .state-indicators label[for="state-empty"],
#state-loading:checked ~ .state-indicators label[for="state-loading"],
#state-error:checked ~ .state-indicators label[for="state-error"] {
  background: var(--primary); color: #fff; border-color: var(--primary);
}
/* Content visibility per state */
.state-section { display: none; }
#state-data:checked ~ .state-data-content,
#state-empty:checked ~ .state-empty-content,
#state-loading:checked ~ .state-loading-content,
#state-error:checked ~ .state-error-content { display: block; }

/* ── Loading Skeleton ── */
.skeleton { background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-sm); }
.skeleton-row { height: 20px; margin-bottom: var(--spacing-sm); width: 100%; }
.skeleton-row:nth-child(2) { width: 80%; }
.skeleton-row:nth-child(3) { width: 60%; }
.skeleton-table-row { height: 40px; margin-bottom: 4px; }
.skeleton-card { height: 120px; border-radius: var(--radius-md); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

/* ── Empty State ── */
.ui-empty { text-align: center; padding: var(--spacing-2xl); }
.ui-empty-icon { font-size: 48px; color: var(--text-disabled); margin-bottom: var(--spacing-md); }
.ui-empty-title { font-size: var(--font-size-lg); color: var(--text-secondary); margin-bottom: var(--spacing-sm); }
.ui-empty-desc { font-size: var(--font-size-sm); color: var(--text-tertiary); margin-bottom: var(--spacing-lg); }

/* ── Error State ── */
.ui-error-state { text-align: center; padding: var(--spacing-2xl); }
.ui-error-icon { font-size: 48px; color: var(--error); margin-bottom: var(--spacing-md); }
.ui-error-title { font-size: var(--font-size-lg); color: var(--error); margin-bottom: var(--spacing-sm); }
.ui-error-desc { font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--spacing-lg); }

/* ── Mobile-specific adjustments ── */
.mobile-layout .ui-layout-sider { display: none; }
.mobile-layout .ui-layout-content { padding: var(--spacing-sm); }
.mobile-layout .ui-table { display: block; }
.mobile-layout .ui-table thead { display: none; }
.mobile-layout .ui-table tbody tr { display: block; padding: var(--spacing-sm); margin-bottom: var(--spacing-sm); border: 1px solid var(--border); border-radius: var(--radius-md); }
.mobile-layout .ui-table tbody td { display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border: none; }
.mobile-layout .ui-table tbody td::before { content: attr(data-label); font-weight: var(--font-weight-semibold); color: var(--text-secondary); }

/* ── Utilities ── */
.ui-divider { border: none; border-top: 1px solid var(--border); margin: var(--spacing-lg) 0; }
.ui-space { display: flex; gap: var(--spacing-sm); }
.ui-space-wrap { flex-wrap: wrap; }

/* ── Responsive — Desktop-first (web target) ── */
@media (min-width: 1200px) {
  .ui-layout-content { padding: var(--spacing-xl); }
  .ui-search-row { flex-wrap: nowrap; }
}

@media (max-width: 991px) {
  .ui-layout-sider { width: var(--sidebar-collapsed-width); }
  .ui-layout-sider .ui-menu-text { display: none; }
}

@media (max-width: 768px) {
  .ui-search-row { flex-direction: column; }
  .ui-search-item { min-width: 100%; }
  .ui-layout-sider { display: none; }
  .ui-layout-content { padding: var(--spacing-sm); }
  .ui-modal { min-width: unset; width: 90vw; }
  .ui-table { font-size: var(--font-size-sm); }
  .ui-table th, .ui-table td { padding: var(--spacing-xs) var(--spacing-sm); }
  .ui-btn { height: 44px; } /* Larger touch targets for mobile */
  .ui-input { height: 44px; }
  .ui-select { height: 44px; }
}

/* ── Mobile Responsive (mobile target) ── */
@media (max-width: 767px) {
  .ui-layout { flex-direction: column; }
  .ui-mobile-header { display: flex; position: sticky; top: 0; z-index: 100; background: var(--bg-elevated); border-bottom: 1px solid var(--border); height: var(--header-height); align-items: center; padding: 0 var(--spacing-md); }
  .ui-mobile-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: var(--bg-elevated); border-top: 1px solid var(--border); justify-content: space-around; padding: var(--spacing-xs) 0; }
  .ui-mobile-nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: var(--text-secondary); cursor: pointer; padding: var(--spacing-xs) var(--spacing-sm); }
  .ui-mobile-nav-item.active { color: var(--primary); }
  .ui-mobile-nav-item svg { width: 24px; height: 24px; }
  .ui-table tbody tr { display: block; margin-bottom: var(--spacing-sm); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .ui-table thead { display: none; }
  .ui-table tbody td { display: flex; justify-content: space-between; padding: var(--spacing-xs) var(--spacing-sm); border: none; }
  .ui-table tbody td::before { content: attr(data-label); font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
}
```

---

## Appendix C: Interaction Patterns

### Modal Dialog (Checkbox Hack)

```html
<input type="checkbox" id="modal-demo" class="toggle-modal" hidden>
<div class="ui-modal-overlay">
  <div class="ui-modal">
    <div class="ui-modal-header">
      <span>Title</span>
      <label for="modal-demo" class="ui-modal-close">&times;</label>
    </div>
    <div class="ui-modal-body">Content</div>
    <div class="ui-modal-footer">
      <label for="modal-demo" class="ui-btn">Cancel</label>
      <button class="ui-btn ui-btn-primary">Confirm</button>
    </div>
  </div>
</div>
<label for="modal-demo" class="ui-btn ui-btn-primary">Open Modal</label>
```

```css
.toggle-modal { display: none; }
.toggle-modal:checked + .ui-modal-overlay { display: flex; }
```

### Tab Switching (Radio Hack)

```html
<div class="tab-container">
  <input type="radio" name="tg" id="tab-1" class="tab-radio" checked hidden>
  <input type="radio" name="tg" id="tab-2" class="tab-radio" hidden>
  <input type="radio" name="tg" id="tab-3" class="tab-radio" hidden>
  <div class="ui-tabs">
    <label for="tab-1" class="ui-tab">Tab 1</label>
    <label for="tab-2" class="ui-tab">Tab 2</label>
    <label for="tab-3" class="ui-tab">Tab 3</label>
  </div>
  <div class="tab-panel panel-1">Content 1</div>
  <div class="tab-panel panel-2">Content 2</div>
  <div class="tab-panel panel-3">Content 3</div>
</div>
```

```css
.tab-radio { display: none; }
.tab-panel { display: none; }
#tab-1:checked ~ .panel-1,
#tab-2:checked ~ .panel-2,
#tab-3:checked ~ .panel-3 { display: block; }
#tab-1:checked ~ .ui-tabs label[for="tab-1"],
#tab-2:checked ~ .ui-tabs label[for="tab-2"],
#tab-3:checked ~ .ui-tabs label[for="tab-3"] { color: var(--primary); border-bottom-color: var(--primary); }
```

### Alert Dismiss

```html
<input type="checkbox" id="alert-demo" class="alert-toggle" hidden>
<div class="ui-alert ui-alert-info">
  <span>Info alert message</span>
  <label for="alert-demo" style="margin-left:auto;cursor:pointer;">&times;</label>
</div>
```

```css
.alert-toggle:checked + .ui-alert { display: none; }
```

---

## Appendix D: Multi-Page Directory Structure

```
prototypes/
├── index.html           # Lightweight entry shell only
├── shared.css           # ALL theme + skeleton CSS (single source of truth)
├── assets/              # Images if any
├── module-a/
│   ├── list.html        # Sidebar: module-a > list active
│   ├── detail.html      # Sidebar: module-a > detail active
│   └── form.html        # Sidebar: module-a > form active
└── module-b/
    ├── dashboard.html   # Sidebar: module-b > dashboard active
    └── report.html      # Sidebar: module-b > report active
```

**Rules:**
- `shared.css` generated first, referenced as `<link rel="stylesheet" href="../shared.css">`
- Page `<style>` = page-specific overrides only — never redefine skeleton
- Each page includes theme switcher HTML+JS
- Navigation via `<a href="module-a/list.html">`
- `index.html` has zero business content — identity + description + quick links only

---

## Harness Feedback Loop

| Gate | Verification Action | Failure Handling |
|------|--------------------|------------------|
| Gate 1 | Verify all required params collected + project context detection complete | `<!-- ⚠️ [GATE1] Missing: {list} -->` |
| Gate 1.5 | Verify annotation content for all required layers + drawer embedded | Back to Phase 1.5, fill missing layers |
| Gate 2 | Verify self-check + quality review passed | Fix all failures. If 5+ fail, restart Phase 1 |

---

## Green Team Supplement — Safety & Security

### S.1 Parameter Validation

| Parameter | Allowed Values | Default | Validation Failure Action |
|-----------|---------------|---------|---------------------------|
| Prototype mode | `single-page`, `multi-page` | `single-page` | Log warning, use default, annotate |
| Dev scenario | `new-project`, `iteration` | `new-project` | Same as above |
| Page name | Non-empty, no `/` `\` `: * ? " < > \|`, ≤ 255 chars | MUST be provided | Reject. After 3 rejections: `"untitled-page"` |
| Page type | `list`, `form`, `detail`, `dashboard`, `composite` | Auto-detect → `list` | Use auto-detect, then default |
| Device target | `web`, `mobile` | `web` | Same as prototype mode |

### S.2 Path Safety Rules

1. Resolve to absolute path using workspace root
2. Verify resolved path starts with workspace root (reject `../../../etc`)
3. If target file exists, ask user to confirm overwrite
4. Reject reserved names: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`
5. Do not create directories deeper than 5 levels from output root
6. Ensure output file ends in `.html`

### S.3 CDN / External Resource Strategy

Zero external dependencies — all CSS self-contained. Annotation drawer uses minimal inline JS (Ctrl+B toggle, Escape close, resize). If workspace forbids inline scripts, remove drawer JS, annotate: `<!-- ⚠️ [SECURITY] Inline JS disabled — annotation drawer requires JS. -->`

### S.4 Failure Handling Protocol

| Level | Condition | Action |
|-------|-----------|--------|
| **Info** | Non-critical dimension missing | Auto-detect or default. `<!-- ⚡ [AUTO] -->` |
| **Warning** | Parameter invalid, path conflict | Use fallback. `<!-- ⚠️ [WARN] -->` |
| **Error** | Required file unreadable, template missing | Ask user. `<!-- 🚨 [ERROR] -->` |
| **Critical** | All data sources unavailable | Report failure. Do NOT generate empty output. |

### S.5 Boundary Conditions

| Condition | Handling |
|-----------|----------|
| Empty dataset | Show `.ui-empty` with guidance text |
| Long text overflow | `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;` |
| Modal content overflow | `.ui-modal-body { max-height: 60vh; overflow-y: auto; }` |
| Null/undefined state values | Default display `—` (em dash) for empty table cells |

### S.6 Annotation Standards

```
<!-- PRD: {section-ref} -->                    # Maps to PRD section
<!-- [新增] {description} -->                   # New content in iteration
<!-- [变更] {description} -->                   # Changed content in iteration
<!-- ⚠️ [PARAM] {param} defaulted to {value} -->  # Parameter fallback
<!-- ⚡ [AUTO] {dimension}={value} -->            # Auto-detected value
<!-- 🚨 [ERROR] {description} → {action} -->      # Error and recovery
```

---

## Iron Rules

1. **Self-contained**: No external files, no CDN — everything in one HTML (or shared.css for multi-page)
2. **CSS variables, never hardcode**: Hex values only inside `:root` theme definition
3. **Responsive**: Desktop-first (web) or mobile-first (mobile)
4. **CSS-only interactions**: Checkbox/radio hacks — no JS except annotation drawer
5. **Annotation drawer mandatory**: Every prototype includes Ctrl+B toggleable L0-L6 drawer
6. **Single file ≤ 800 lines**: Split for multi-page mode
7. **Context detection mandatory**: Never default to standalone without asking
8. **Multi-page shared CSS single source**: `shared.css` first, referenced by all pages
9. **Quality review mandatory**: Generate and output a review report
10. **Stop after 2 unresolved rendering issues**: Report to user
11. **Iteration preserves existing**: Only modify what PRD explicitly changes
12. **`index.html` = lightweight shell**: No business content in the entry page
13. **Validate or default**: Every parameter validated; invalid values fall back with annotation
14. **Path safety**: Never write outside workspace, never overwrite without confirmation
15. **Fail with annotation**: Every failure produces `<!-- ⚠️ -->` or `<!-- 🚨 -->` — never fail silently
16. **All states required**: Data / Empty / Loading / Error state views triggerable via checkbox/radio
