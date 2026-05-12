# kf-ui-prototype-generator

## Merged — Zero-Dependency, Theme-Switchable

### Core Innovation

This skill generates **self-contained HTML prototypes** that ship with all 6 major Chinese enterprise design systems embedded as inline CSS variables. Every prototype includes a **built-in theme switcher** — users toggle between Ant Design, Element Plus, Arco Design, Semi Design, TDesign, and Built-in themes in real time, with no CDN, no network, no external dependencies.

### Architecture

- **Pattern:** Generator (self-contained — no `assets/`, no `references/`, no external files)
- **3-Phase flow:** Intake (inputs + decisions) → Build (theme injection + HTML + interactions) → Verify (self-check + quality review + Harness gates)
- **CSS variable system:** 2-layer architecture — generic semantic variables (`--primary`, `--bg`, `--text`, `--radius`, etc.) mapped to 6 theme-specific class overrides

### Key Features

| Feature | Description |
|---------|-------------|
| **6 Design Systems** | Complete CSS variable definitions for Ant Design, Element Plus, Arco Design, Semi Design, TDesign, and Built-in |
| **Theme Switcher** | Inline widget in every generated prototype — instant visual comparison across all themes |
| **Zero Dependencies** | No CDN, no external fonts, no JS frameworks — everything in one HTML file |
| **CSS-Only Interactions** | Checkbox/radio hacks for modals, tabs, dropdowns — no JS except theme switcher |
| **Privacy-Safe** | Fully offline — no network requests, no tracking, no third-party resources |
| **Real Demo Data** | 5-8 realistic rows with varied status tags, timestamps, and business values |
| **4-State Views** | Data / Empty / Loading / Error — toggleable via radio buttons |
| **Theme Context Mapping** | Scene-aware theme suggestions: admin → antd, client-portal → element, mobile → semi |
| **Device-Adaptive Layout** | Web target (desktop-first sidebar) vs Mobile target (bottom nav, full-width cards) |
| **No Dead Buttons Rule** | Every button/action triggers a modal, navigation, or state change |

### What Changed (vs. Original)

- Removed all external file references (`assets/`, `references/`, CDN URLs)
- Inlined 6 complete theme CSS libraries (~250 lines per theme) covering brand, functional, neutral colors, typography, spacing, radius, shadow, breakpoints, transitions, and layout
- Added built-in theme switcher widget with visual swatch buttons
- Added real data generation requirements (5-8 rows, varied statuses, realistic values)
- Added 4-state view display (data/empty/loading/error) with CSS toggle mechanism
- Added device target parameter (web/mobile) with distinct responsive strategies
- Added theme context mapping (admin/client-portal/public-site/mobile-app)
- Added "no dead buttons" interaction completeness rule
- Added interaction completeness and navigation integrity to self-check and quality review
- Responsive CSS now includes mobile-specific layout (bottom navigation bar, card-style tables)
- Harness Gate mechanism preserved

### Green Team Supplement — Safety & Security

| Feature | Description |
|---------|-------------|
| **Parameter Validation** | Every input validated against allowed values with documented fallbacks |
| **Path Safety** | Workspace boundary enforcement, reserved name checks, nesting limits |
| **Failure Escalation** | 4-level protocol (Info > Warning > Error > Critical) with annotation standards |
| **Boundary Conditions** | Long text truncation, modal overflow, empty cells, missing images, CSS variable fallbacks |
| **Annotation Standards** | Mandatory `<!-- ⚠️ -->` / `<!-- 🚨 -->` / `<!-- ⚡ -->` annotations for every override |
| **Gate Override Protocol** | Explicit override mechanism with output annotations when user bypasses gates |
| **Self-Check Supplement** | Additional checks for path correctness, boundary conditions, annotation completeness |
| **CDN Strategy** | Zero external dependencies by design — no CDN fallback needed |

### Change Log (Green Team)

- Added parameter validation table with fallback actions (S.1)
- Added workspace path safety rules with boundary enforcement (S.2)
- Added inline script security fallback (S.3)
- Added 4-level failure escalation protocol (S.4)
- Added boundary condition handling for long text, overflow, empty states (S.5)
- Added mandatory annotation standards with severity levels (S.6)
- Added self-check supplement for path, boundary, and annotation verification (S.7)
- Added Harness Feedback Loop with gate override and output integrity verification
- Added Iron Rules 13-16: validate-or-default, path safety, fail-with-annotation, all-states-required

### Related Skills

- `kf-alignment` — Pre-generation requirements alignment
- `kf-skill-design-expert` — Harness Engineering design principles
- `kf-image-editor` — Image editing for prototype assets
- `kf-multi-team-compete` — Multi-agent competition framework
