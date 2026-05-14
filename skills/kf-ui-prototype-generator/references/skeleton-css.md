# Appendix B: Responsive Skeleton CSS

Theme-agnostic — references only `var()` values. Copy into every generated prototype.

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
  .ui-btn { height: 44px; }
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
  .ui-table tbody tr { display: block; margin-bottom: var(--spacing-sm); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .ui-table thead { display: none; }
  .ui-table tbody td { display: flex; justify-content: space-between; padding: var(--spacing-xs) var(--spacing-sm); border: none; }
  .ui-table tbody td::before { content: attr(data-label); font-weight: var(--font-weight-semibold); color: var(--text-secondary); }
}
```
