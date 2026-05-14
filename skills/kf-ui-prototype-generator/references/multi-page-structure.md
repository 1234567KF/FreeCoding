# Appendix D: Multi-Page Directory Structure

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

## Rules

- `shared.css` generated first, referenced as `<link rel="stylesheet" href="../shared.css">`
- Page `<style>` = page-specific overrides only — never redefine skeleton classes
- Each page includes the annotation drawer HTML+JS
- Navigation via `<a href="module-a/list.html">` — no JS navigation
- `index.html` has zero business content — identity + description + quick links only

## Multi-Page Generation Checklist

- [ ] `shared.css` generated first, referenced by all pages
- [ ] No skeleton class redefinition in page `<style>` blocks
- [ ] Sidebar HTML identical across pages (except active item)
- [ ] Directory structure mirrors menu structure
- [ ] `index.html` = lightweight shell only
- [ ] All navigation via `<a href>` — no JS
- [ ] Every sidebar menu item has a corresponding HTML page
- [ ] All inter-page `<a href>` paths resolve correctly
- [ ] `shared.css` path is relative and correct from each page depth level
- [ ] No page generates a file with the same name as a reserved OS filename
