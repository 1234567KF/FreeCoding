---
name: kf-ui-prototype-generator
description: >-
  Generate zero-dependency, theme-switchable HTML prototypes from PRD documents
  that embed all 6 major design systems (Ant Design, Element Plus, Arco Design,
  Semi Design, TDesign, Built-in) as inline CSS variables. Every prototype ships
  with a built-in theme switcher for instant visual comparison.
  Triggers: "生成原型", "UI原型", "页面原型", "HTML原型", "prototype".
metadata:
  pattern: generator
  domain: ui-prototype
integrated-skills:
  - kf-alignment
recommended_model: flash
graph:
  dependencies:
    - target: kf-alignment
      type: workflow  # 原型后对齐

---

# UI Prototype Generator — Self-Contained, Theme-Switchable

> Red Team Reconstruction: Zero external dependencies. Six design systems, one HTML. Theme-switchable out of the box.

Generate high-fidelity HTML prototypes from PRD documents. This is a **self-contained** skill — all design system variables, component decision rules, and generation templates are embedded directly. No `assets/`, no `references/`, no CDN dependencies.

Every generated HTML ships with a **built-in theme switcher** — toggle between Ant Design, Element Plus, Arco Design, Semi Design, TDesign, and Built-in themes with one click.

---

## Architecture Overview

```
Phase 0: Intake          Phase 1: Build            Phase 2: Verify
─────────────────────     ──────────────────────   ─────────────────
Collect Inputs       →    Theme Injection           Self-Check
Project Detect            HTML Skeleton + CSS       Quality Review
PRD Parse                 Interaction Layer         Harness Gate
Component Decision        Theme Switcher Widget     Auto-Repair
    │                             │                       │
    └───── Gate 1 ───────────────┴────── Gate 2 ─────────┘
```

---

## Phase 0 — Intake (Inputs + Decisions)

### Step 0.1 — Collect Required Inputs

Confirm all required parameters. Ask for missing items one at a time.

| Parameter | Required | Description |
|-----------|----------|-------------|
| PRD document | Yes | Reference via `@file` |
| Prototype mode | optional | **Single-page** (default) or **Multi-page** |
| Dev scenario | optional | **New project** (default) or **Iteration** |
| Page name | Yes | Target page name (single) or main page name (multi) |
| Page list | optional | Multi-page only. Auto-detect from PRD if omitted |
| Output path | optional | Relative to workspace root, e.g. `prototypes/` |
| Design theme | optional | antd (default) / element / arco / semi / tdesign / none |
| Page type | optional | List / Form / Detail / Dashboard / Composite |
| Device target | optional | **web** (default) or **mobile** — determines responsive breakpoints and layout density |
| Theme context | optional | **auto** (default) / **admin** / **client-portal** / **public-site** / **mobile-app** — maps to recommended theme |

**Theme Context Mapping (when Theme Context = auto or specified):**

| Context | Recommended Theme | Rationale | Layout Preference |
|---------|------------------|-----------|-------------------|
| admin | antd | Admin panels traditionally use Ant Design | Dense layout, full sidebar, wide tables |
| client-portal | Element Plus | Client-facing portals prefer Element's cleaner look | Card-based content, moderate density |
| public-site | Built-in (none) | No vendor lock-in for public-facing sites | Hero sections, centered content |
| mobile-app | Semi Design | Mobile-optimized components, touch-friendly | Bottom nav, full-width cards, large touch targets |
| auto | Detect from PRD language | "后台"/"admin" → antd, "门户"/"portal" → element | Auto-detect |

### Step 0.2 — Project Context Detection

After collecting parameters, scan the workspace:

1. Search for directories with page-level component files (`.vue`, `.tsx`, `.jsx`, `.dart`, `.swift`)
2. Reference framework config files (`vite.config.*`, `next.config.*`, `nuxt.config.*`)
3. Identify route configuration files for page directory locations

- **Detected** → Enter **Context-Aware Mode**: "Detected project page directory `xxx/`, will generate based on existing page style."
- **Not detected** → Ask: "No project page directory detected. Is this for an actual project? If so, specify via `@folder`."
  - User provides directory → Context-Aware Mode
  - User says "standalone" → **Standalone Mode**, annotate: `<!-- Standalone prototype -->`

> Must not proceed to generation without completing project context detection.

### Step 0.3 — Parse PRD Page Requirements

**Context-Aware Mode:** Scan project page directory:
- Page exists? → Renovation: read existing template as baseline, only modify areas PRD explicitly requires
- New page? → Scan similar pages for layout conventions, inherit their patterns

**Standalone Mode:** Skip project analysis, generate from default template.

Read the `@file` PRD document (use docx/pdf skill for `.docx`/`.pdf`):
- Extract field definitions, interaction logic, business rules
- For unclear PRD descriptions, log questions — do not assume

### Step 0.4 — Component Decision Matrix

Match PRD semantics to HTML components. Read by **row = user intent** → **column = data shape**:

| Intent \ Data Shape | Single Value | List / Array | Hierarchical | Rich Content |
|---------------------|-------------|--------------|--------------|--------------|
| Input / Create | Input / Select / DatePicker | Checkbox.Group / Transfer | TreeSelect / Cascader | Editor / Upload |
| Display / Read | Text / Badge / Tag | Table / List / Card.Grid | Tree / Collapse | Descriptions / Card |
| Action / Trigger | Button / Link | Dropdown.Button | Menu | Modal.confirm / Drawer |
| Filter / Query | Input.Search / Select | DatePicker.RangePicker | TreeSelect | — |
| Navigate / Structure | Breadcrumb | Tabs / Steps | Menu / Pagination | Layout / Space |
| Feedback / Alert | Tooltip / Popover | — | — | Modal / Drawer / Alert |

**Note:** These names map to semantic CSS classes (`.ui-table`, `.ui-btn`, `.ui-card`) styled by theme variables — not a specific vendor library.

### Gate 1 — Intake Completion

> Do not enter Phase 1 until all required parameters are collected, project context detection is complete, and PRD is parsed.

Verification: `harness-gate-check.cjs --skill kf-ui-prototype-generator --stage gate1 --required-sections "页面名称" --forbidden-patterns "待定"`

---

## Phase 1 — Build (HTML Generation)

### Step 1.1 — Theme Selection & CSS Variable Injection

Select design theme from user input or default to **antd**. The generated HTML will embed **all 6 themes** as CSS classes, allowing runtime switching.

| Theme | Origin | Primary Color | Class Name |
|-------|--------|--------------|------------|
| Ant Design | Ant Group / Alibaba | #1890ff | `.theme-antd` |
| Element Plus | Ele.me | #409eff | `.theme-element` |
| Arco Design | ByteDance | #165dff | `.theme-arco` |
| Semi Design | ByteDance / TikTok | #0077fa | `.theme-semi` |
| TDesign | Tencent | #0052d9 | `.theme-tdesign` |
| Built-in | Generic | #1677ff | `.theme-none` |

**Architecture:** Every generated HTML uses a **two-layer variable system**:

```
Layer 1: Shared semantic variables (what HTML actually uses)
  --primary, --bg, --text, --radius, --shadow ...

Layer 2: Theme-specific overrides (6 theme classes map values to Layer 1)
  .theme-antd { --primary: #1890ff; ... }
  .theme-element { --primary: #409eff; ... }
```

The HTML skeleton references only `var(--primary)`, `var(--text)`, etc. Switching `.theme-antd` to `.theme-element` on `<html>` instantly re-themes the entire page.

All 6 theme definitions are in **Appendix A**. Copy them verbatim into the generated HTML `<style>` block.

### Step 1.2 — Generate HTML Skeleton

Use this structure for every generated prototype:

```html
<!DOCTYPE html>
<html lang="zh-CN" class="theme-antd">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{page_title}}</title>
  <style>
    /* Layer 1: All 6 theme CSS variables (copy from Appendix A) */

    /* Layer 2: Theme Switcher Widget CSS */

    /* Layer 3: Skeleton Layout + Components (copy from Appendix B) */

    /* Layer 4: Responsive Breakpoints */

    /* Layer 5: Interaction Animations */
  </style>
</head>
<body>
  <!-- Theme Switcher Widget -->
  <div class="theme-switcher" id="themeSwitcher">
    <span class="theme-switcher-label">Theme</span>
    <div class="theme-switcher-options">
      <button class="theme-btn active" data-theme="theme-antd" style="--swatch:#1890ff" title="Ant Design">Ant</button>
      <button class="theme-btn" data-theme="theme-element" style="--swatch:#409eff" title="Element Plus">Ele</button>
      <button class="theme-btn" data-theme="theme-arco" style="--swatch:#165dff" title="Arco Design">Arc</button>
      <button class="theme-btn" data-theme="theme-semi" style="--swatch:#0077fa" title="Semi Design">Semi</button>
      <button class="theme-btn" data-theme="theme-tdesign" style="--swatch:#0052d9" title="TDesign">TD</button>
      <button class="theme-btn" data-theme="theme-none" style="--swatch:#1677ff" title="Built-in">Base</button>
    </div>
  </div>

  <!-- Page Content -->
  {{page_content}}

  <script>
    (function() {
      var btns = document.querySelectorAll('.theme-btn');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          document.documentElement.className = btn.getAttribute('data-theme');
        });
      });
    })();
  </script>
</body>
</html>
```

#### Generation Rules — Responsive Strategy

**Device-aware responsive tiers:**
- **web target**: Desktop-first with mobile fallback. Sidebar visible at ≥ 992px, collapses to hamburger at < 768px. Tables show full columns on desktop, collapse to card view on mobile.
- **mobile target**: Mobile-first with tablet adaptation. Bottom tab navigation instead of sidebar. Full-width cards instead of tables. Touch targets ≥ 44px. Single-column layouts by default.

**Responsive layout switching rules:**
| Component | Web (≥ 992px) | Tablet (768-991px) | Mobile (< 768px) |
|-----------|--------------|-------------------|-------------------|
| Sidebar | Fixed, expanded | Collapsible icon nav | Hidden, hamburger menu |
| Tables | Full columns, horizontal scroll | Key columns only + expand row | Convert to card list |
| Search area | Multi-row inline | 2-column grid | Single column, stacked |
| Cards | 3-4 per row | 2 per row | 1 per row, full width |
| Modals | Centered, 520px | Centered, 80% width | Full-screen drawer |
| Buttons | Inline with text | Text + icon | Icon-only or full-width |

**Real Data Generation Rules — No Empty Tables:**

1. **Table data MUST include 5-8 rows** of realistic demo data with varied states:
   - Normal row, disabled/inactive row, pending review row
   - Mix of tag statuses (some success, some warning, some error, some default)
   - Timestamps with realistic dates (not "2024-01-01" placeholder)
   - People names, amounts, progress values — not "xxx" or "test"
2. **Status distribution**: At least 3 unique status values across rows, each with appropriate tag color
3. **Search defaults**: Pre-fill search fields with example values to show form usage
4. **Empty state**: Only shown when explicitly toggled via checkbox hack (not the default view)
5. **Error state**: Include an `<!-- ERROR STATE DEMO -->` section that can be triggered via checkbox

**All Buttons Must Be Functional — No Dead Buttons Rule:**
- Every button/link must trigger an action: open modal, navigate to page, toggle state, or submit form
- Use checkbox/radio hacks for modals and drawers
- Use `<a href>` for page navigation (even within single-page mode, link to `#section-id`)
- Table action buttons (view/edit/delete) must each open their respective modal
- "Add" / "Create" buttons must open creation form modals
- Buttons with no defined action in PRD: create a confirmation modal with "This feature is not yet implemented"
- Pagination page numbers must be clickable and change visible content

**Four Mandatory State Views — Every page must include:**
1. **Data state** (default) — real content with varied rows
2. **Empty state** — `.ui-empty` with illustration text, triggerable via checkbox: `<!-- EMPTY STATE: check #show-empty to see -->`
3. **Loading state** — skeleton shimmer animation, triggerable via checkbox: `<!-- LOADING STATE: check #show-loading to see -->`
4. **Error state** — error alert + retry button, triggerable via checkbox: `<!-- ERROR STATE: check #show-error to see -->`

Example state-switching pattern:
```html
<input type="radio" name="state" id="state-data" class="state-radio" checked hidden>
<input type="radio" name="state" id="state-empty" class="state-radio" hidden>
<input type="radio" name="state" id="state-loading" class="state-radio" hidden>
<input type="radio" name="state" id="state-error" class="state-radio" hidden>

<div class="state-indicators">
  <label for="state-data">Data</label>
  <label for="state-empty">Empty</label>
  <label for="state-loading">Loading</label>
  <label for="state-error">Error</label>
</div>

<!-- Content for each state, shown via :checked ~ -->
```

**Navigation Completeness Rules:**
- All menu items in sidebar/navbar must link to a page (or open a modal explaining the section)
- In multi-page mode, every module in the menu must have a corresponding HTML file
- Breadcrumb items must be clickable links (except current page)
- Table action buttons (View / Edit / Delete) must each trigger distinct modals with different content
- Pagination links must navigate between page numbers (use ID anchors for single-page)

1. **Semantic CSS classes only**: Use `.ui-table`, `.ui-btn`, `.ui-card`, `.ui-modal`, `.ui-form`, `.ui-input`, `.ui-select`, `.ui-tag`, `.ui-badge`, `.ui-menu`, `.ui-tabs`, `.ui-breadcrumb`, `.ui-pagination`, `.ui-alert`, `.ui-drawer` — styled by theme variables
2. **CSS variables for everything**: No hardcoded color, spacing, or radius values; use `var(--primary)`, `var(--spacing-md)`, `var(--radius-md)`
3. **Responsive**: Mobile-first, `min-width` media queries using theme breakpoints
4. **No inline styles for layout**: Must use classes
5. **No external JS runtime**: Theme switcher is the only JS — lightweight inline script
6. **Single file ≤ 800 lines**: Split into multiple files if exceeded
7. **Zero external dependencies**: No CDN, no external fonts, no external assets

#### Iteration Scenario

When dev scenario is **Iteration**:
- Use existing page structure as baseline, only reflect PRD changes
- Annotate: `<!-- [新增] -->` / `<!-- [变更] -->`
- Preserve unchanged areas exactly — no "optimization along the way"
- If unsure, pause and ask

#### Multi-Page Navigation

When mode is **Multi-page**:
1. Create directory structure by menu module
2. Generate `shared.css` first (theme variables + skeleton) — all pages reference via `<link>`
3. Output standard sidebar snippet once; all pages copy it verbatim (only changing active item)
4. `index.html` = lightweight shell: project identity, description, quick links only
5. Inter-page links use `<a href>` with relative paths — no JS navigation
6. Iteration: only overwrite changed pages, preserve unchanged files

### Step 1.3 — Theme Switcher Widget

Every generated prototype includes a floating toolbar (top-right corner) for real-time theme switching. Default position: fixed, top-right, z-index 99999.

The widget CSS and JS are included in the template above. Customization options:
- Position: top-right (default), top-left, bottom-right, bottom-left
- Compact mode: collapsed by default showing only a palette icon
- Theme order: same as the table in Step 1.1

### Step 1.4 — Interaction Simulation (CSS-Only)

Use CSS checkbox/radio hacks for interactions — no JS required (except theme switcher).

| Interaction | CSS Technique |
|-------------|--------------|
| Modal open/close | `input[type=checkbox]:checked ~ .modal-overlay { display: flex; }` |
| Tab switching | `input[type=radio]:checked ~ .tab-panel-n { display: block; }` |
| Dropdown menu | Checkbox hack with absolute positioning |
| Button loading | `.btn-loading::after { animation: spin; }` |
| Button disabled | `.btn-disabled { opacity: 0.4; pointer-events: none; }` |
| Form validation | `.field-error { border-color: var(--error); }` |
| Empty state | `.empty-state { ... }` class |
| Alert dismiss | Checkbox + `.alert-toggle:checked + .ui-alert { display: none; }` |
| Table row hover | `.ui-table tbody tr:hover { background: var(--bg-secondary); }` |
| Skeleton loading | `@keyframes shimmer` animation |

**CSS checkbox hack pattern:**

```html
<input type="checkbox" id="modal-{{id}}" class="modal-trigger" hidden>
<div class="ui-modal-overlay">
  <div class="ui-modal">
    <div class="ui-modal-header">
      <span>Title</span>
      <label for="modal-{{id}}" class="ui-modal-close">&times;</label>
    </div>
    <div class="ui-modal-body">Content</div>
    <div class="ui-modal-footer">
      <label for="modal-{{id}}" class="ui-btn">Cancel</label>
      <button class="ui-btn ui-btn-primary">Confirm</button>
    </div>
  </div>
</div>
<label for="modal-{{id}}" class="ui-btn ui-btn-primary">Open</label>
```

```css
.modal-trigger:checked + .ui-modal-overlay { display: flex; }
```

### Step 1.5 — Annotate

Add inline HTML comments for traceability:
- `<!-- PRD: 4.1 -->` — maps sections back to the PRD
- `<!-- [新增] -->` / `<!-- [变更] -->` — iteration markers
- `<!-- TODO: 确认筛选条件枚举值 -->` — unresolved decisions

---

## Phase 2 — Verify (Quality Closure)

### Step 2.1 — Self-Check

- [ ] Opens in browser without errors (no CDN URLs, no broken references)
- [ ] Layout matches PRD description
- [ ] All form fields correspond to PRD field definitions
- [ ] Theme switcher visible — all 6 themes switch correctly
- [ ] Interactions functional (modal via checkbox hack, tabs via radio hack)
- [ ] CSS variables used everywhere (grep for `#` hex outside theme blocks = fail)
- [ ] Responsive layout works across mobile/tablet/desktop (web target) or touch-friendly (mobile target)
- [ ] Component choices match Step 0.4 decision matrix
- [ ] Single file ≤ 800 lines (or split correctly for multi-page)

**Interaction Completeness (MUST verify every item):**
- [ ] Every `<button>` and `<a>` triggers an action — no dead buttons
- [ ] Table action buttons (View/Edit/Delete) each open different modals with different content
- [ ] "Add" / "Create" buttons open creation form modals
- [ ] Pagination links are clickable and change content
- [ ] Form submission buttons show confirmation or validation feedback
- [ ] Menu items link to pages or meaningful anchors

**State Display Completeness:**
- [ ] **Data state** — 5-8 rows of realistic data with varied statuses (success/warning/error/default tags)
- [ ] **Empty state** — triggerable via checkbox, shows `.ui-empty` with guidance text
- [ ] **Loading state** — triggerable via checkbox, shows shimmer skeleton animation
- [ ] **Error state** — triggerable via checkbox, shows error alert with retry button
- [ ] State toggles are clearly labeled and visible

**Data Quality:**
- [ ] Table has 5-8 rows minimum (not empty placeholder)
- [ ] Rows include varied statuses (at least 3 different tag colors)
- [ ] Timestamps use realistic dates (not "2024-01-01")
- [ ] Names, amounts, progress values are realistic

**Multi-page additional:**
- [ ] `shared.css` generated first, referenced by all pages
- [ ] No skeleton class redefinition in page `<style>` blocks
- [ ] Sidebar HTML identical across pages (except active item)
- [ ] Directory structure mirrors menu structure
- [ ] `index.html` = lightweight shell only
- [ ] All navigation via `<a href>` — no JS
- [ ] Every sidebar menu item has a corresponding HTML page

### Step 2.2 — Quality Review

Two-dimensional review. Output report. Any fail → fix and re-review.

**Component Correctness:**
- Data entry components match PRD semantics
- Data display components match (Tag = pill, not badge)
- CSS class names correspond to theme conventions

**Requirement Consistency:**
- Field completeness (every PRD field in search/table/form/detail)
- Filter conditions with correct input types
- Action buttons complete and correctly labeled
- Status tags with appropriate color schemes
- Interaction flows traversable via CSS hacks
- Data validation rules reflected in forms

**Interaction Completeness Review:**
- Every button triggers a modal, navigation, or state change
- View/Edit/Delete actions open distinct modals with different content
- Pagination page numbers are clickable and change display
- Menu items link to pages or anchors
- No orphan buttons or dead links

**Navigation Integrity Review:**
- Sidebar/menu items cover all PRD modules
- Each menu item links to a meaningful destination
- Breadcrumb trail is complete and navigable
- Table action column has View/Edit/Delete with correct labels
- Multi-page: every menu item maps to a real HTML file

**State Display Review:**
- Data state: 5-8 rows with varied status colors (success/warning/error/default)
- Empty state: shows guidance text and action button
- Loading state: shimmer skeleton animation
- Error state: error message + retry button
- State toggles are accessible and clearly labeled

**Iteration Additional Review:**
- Unchanged regions preserved exactly
- No component type drift
- No action column style drift
- No tag color drift

### Gate 2 — Build & Verification Gate

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
| Gate 1 | Verify all required params collected (PRD doc, page name) + project context detection complete | `⚠️ [GATE1] Missing params: {list}. If user insists, override and annotate output: <!-- ⚠️ Gate 1 OVERRIDE: {param} missing -->` |
| Gate 2 | Verify self-check + quality review passed with no `[❌]` items | Fix all failures. If 5+ checks fail, restart from Phase 1. Output report with `<!-- ⚠️ [GATE2] {n} failures fixed -->` |
| Output Integrity | Verify file exists at output path, non-empty, valid HTML structure | If file write fails (disk full, permission denied): report error to user, suggest alternate path. Retry once. If still fails, output file content as text in chat. |

---

## Green Team Supplement — Safety & Security

This supplement adds defensive guardrails to every phase above. Each rule below is mandatory.

### S.1 Parameter Validation

Every user-supplied parameter must pass validation before use. Invalid values fall back to documented defaults with an annotation.

| Parameter | Allowed Values | Default | Validation Failure Action |
|-----------|---------------|---------|---------------------------|
| Prototype mode | `single-page`, `multi-page` | `single-page` | Log warning, use default, annotate: `<!-- ⚠️ [PARAM] mode="{value}" invalid, defaulted to single-page -->` |
| Dev scenario | `new-project`, `iteration` | `new-project` | Same as above |
| Page name | Non-empty, no `/` `\` `: * ? " < > \|`, ≤ 255 chars, trimmed | MUST be provided | Reject with error message. After 3 rejections: use `"untitled-page"`, annotate override |
| Component library | `antd`, `element`, `arco`, `semi`, `tdesign`, `none` | `antd` | Same as prototype mode |
| Page type | `list`, `form`, `detail`, `dashboard`, `composite` | Auto-detect from PRD → fallback `list` | Use auto-detect, then default |
| Device target | `web`, `mobile` | `web` | Same as prototype mode |
| Theme context | `auto`, `admin`, `client-portal`, `public-site`, `mobile-app` | `auto` | Same as prototype mode |
| Theme mode | `light`, `dark` | `light` | Same as prototype mode |

### S.2 Path Safety Rules

When generating output files, enforce these rules in order:

1. **Resolve to absolute path**: Convert user-specified output path to absolute path using workspace root
2. **Workspace boundary check**: Verify resolved path starts with workspace root. If it escapes (e.g., `../../../etc`), reject and use default `./prototype/`
3. **Existing file check**: If target file already exists, ask user for confirmation to overwrite. If no response within 2 prompts, use a numbered variant (e.g., `mypage-v2.html`)
4. **Reserved name check**: On Windows, reject names: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`. On any OS, reject names containing only dots (`.`, `..`).
5. **Nesting limit**: Do not create directories deeper than 5 levels from the output root
6. **File extension**: Ensure output file ends in `.html`. If user provides a path without extension, append `.html`

**Failure annotation format:**
```
<!-- ⚠️ [PATH] {rule violated}: {description} → used {fallback-path} -->
```

### S.3 CDN / External Resource Strategy

This skill uses **zero external dependencies** — all CSS is self-contained in the generated HTML. However, the theme switcher uses a tiny inline JS (6 lines). If the workspace forbids inline scripts:

- Remove the JS theme switcher
- Default to `.theme-antd` only (no runtime switching)
- Annotate: `<!-- ⚠️ [SECURITY] Inline JS disabled — theme switching requires JS. Defaulting to Ant Design. -->`

### S.4 Failure Handling Protocol

Every step must handle failure gracefully using this escalation ladder:

| Level | Condition | Action |
|-------|-----------|--------|
| **Info** | Non-critical style dimension missing | Auto-detect or use default. Annotate: `<!-- ⚡ [AUTO] {dimension}={value} -->` |
| **Warning** | Parameter invalid, path conflict, file unreadable | Use fallback. Annotate: `<!-- ⚠️ [WARN] {description} → {action} -->` |
| **Error** | Required file unreadable, disk full, template missing | Ask user. After 2 unanswered prompts, use fallback. Annotate: `<!-- 🚨 [ERROR] {description} → {fallback} -->` |
| **Critical** | All data sources unavailable, workspace unreachable | Report failure to user. Do NOT generate empty/broken output. |

**Critical failure rule:** After 2 consecutive critical failures in the same generation session, stop and output a failure report listing all issues. Do NOT retry silently.

### S.5 Boundary Conditions

The generated HTML must account for these scenarios:

| Condition | Handling |
|-----------|----------|
| **Empty dataset** | Show `.ui-empty` with guidance text: "暂无数据，请调整筛选条件" |
| **Long text overflow** | CSS `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;` on all table cells |
| **Modal content overflow** | `.ui-modal-body { max-height: 60vh; overflow-y: auto; }` |
| **Missing image** | `img { max-width: 100%; }` and `alt` text on all images |
| **Form submission without JS** | Show static confirmation state or validation hints via CSS |
| **Table with 0 columns** | Always generate at minimum: column for name, status, action |
| **Browser without CSS variables** | Include fallback values: `color: #333; color: var(--text);` |
| **Null/undefined state values** | Default display value `—` (em dash) for empty table cells |

### S.6 Annotation Standards

Every generated HTML must include these annotation types:

```
<!-- PRD: {section-ref} -->                    # Maps to PRD section
<!-- [新增] {description} -->                   # New content in iteration
<!-- [变更] {description} -->                   # Changed content in iteration
<!-- ⚠️ [PARAM] {param} defaulted to {value} -->  # Parameter fallback
<!-- ⚠️ [PATH] {rule} → {fallback} -->           # Path safety override
<!-- ⚠️ [GATE{n}] {issue} -->                   # Gate override
<!-- ⚡ [AUTO] {dimension}={value} -->            # Auto-detected value
<!-- 🚨 [ERROR] {description} → {action} -->      # Error and recovery
```

### S.7 Self-Check Supplement

Add these checks to Step 2.1 Self-Check:

**Path & Output:**
- [ ] Output file written to the correct path (not workspace-escaped)
- [ ] No overwrite occurred without confirmation
- [ ] File extension is `.html`

**Boundary Conditions:**
- [ ] Long text in table cells uses `text-overflow: ellipsis`
- [ ] Modal content is scrollable (not cut off)
- [ ] Empty cells show `—` not blank/undefined
- [ ] All images have `alt` attribute
- [ ] Required form fields are marked with asterisk

**Annotation Completeness:**
- [ ] Every PRD section mapped via `<!-- PRD: -->` comment
- [ ] Every parameter default documented with `<!-- ⚠️ [PARAM] -->`
- [ ] Every path safety override documented with `<!-- ⚠️ [PATH] -->`
- [ ] Every auto-detected value documented with `<!-- ⚡ [AUTO] -->`

**Multi-Page Boundary Checks:**
- [ ] All inter-page `<a href>` paths resolve correctly (no dead links, no absolute paths)
- [ ] `shared.css` path is relative and correct from each page depth level
- [ ] No page generates a file with the same name as a reserved OS filename
- [ ] Sidebar HTML identical across all pages (diff check on active-item only difference)

---

## Iron Rules

1. **Self-contained**: No external files, no CDN, no `assets/` or `references/` — everything in one HTML
2. **CSS variables, never hardcode**: Hex values only inside theme definition blocks
3. **Responsive**: Mobile-first, `min-width` breakpoints. Web and mobile layouts must differ.
4. **CSS-only interactions**: Checkbox/radio hacks — no JS except theme switcher
5. **Theme switcher mandatory**: Every generated prototype includes it with all 6 themes
6. **Single file ≤ 800 lines**: Split for multi-page mode
7. **Context detection mandatory**: Never default to standalone without asking
8. **Multi-page shared CSS single source**: `shared.css` first, referenced by all pages
9. **Quality review mandatory**: Generate and output a review report
10. **Stop after 2 unresolved rendering issues**: Report to user
11. **Iteration preserves existing**: Only modify what PRD explicitly changes
12. **`index.html` = lightweight shell**: No business content in the entry page
13. **Validate or default**: Every user parameter must be validated; invalid values fall back to documented defaults with `<!-- ⚠️ [PARAM] -->` annotation
14. **Path safety**: Never write outside workspace, never overwrite without confirmation, never use reserved filenames
15. **Fail with annotation**: Every failure mode must produce a `<!-- ⚠️ -->` or `<!-- 🚨 -->` annotation — never fail silently
16. **All states required**: Every page must include Data / Empty / Loading / Error state views triggerable via checkbox/radio
