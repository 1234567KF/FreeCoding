# Appendix C: Interaction Patterns

CSS-only interaction patterns. No JavaScript required.

## Modal Dialog (Checkbox Hack)

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

## Tab Switching (Radio Hack)

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

## Alert Dismiss

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

## Interaction → CSS Technique Mapping

| Interaction | CSS Technique |
|-------------|--------------|
| Modal open/close | `input[type=checkbox]:checked ~ .modal-overlay { display: flex; }` |
| Tab switching | `input[type=radio]:checked ~ .tab-panel-n { display: block; }` |
| Dropdown menu | Checkbox hack with absolute positioning |
| Button loading | `.btn-loading::after { animation: spin; }` |
| Button disabled | `.btn-disabled { opacity: 0.4; pointer-events: none; }` |
| Form validation | `.field-error { border-color: var(--error); }` |
| Empty state | `.ui-empty { ... }` class |
| Alert dismiss | Checkbox + `.alert-toggle:checked + .ui-alert { display: none; }` |
| Table row hover | `.ui-table tbody tr:hover { background: var(--bg-secondary); }` |
| Skeleton loading | `@keyframes shimmer` animation |
