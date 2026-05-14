# Annotation Drawer Template (暗门注释抽屉)

Copy this verbatim into the generated HTML. The drawer provides L0-L6 tab navigation with Ctrl+B toggle and Escape close.

## HTML Structure

```html
<!-- Annotation Drawer -->
<div class="anno-drawer" id="annoDrawer">
  <div class="anno-drawer-header">
    <span class="anno-drawer-title">暗门注释</span>
    <button class="anno-drawer-close" id="annoClose" title="Close (Esc)">&times;</button>
  </div>
  <div class="anno-drawer-tabs">
    <button class="anno-tab active" data-tab="anno-tab-l0">L0</button>
    <button class="anno-tab" data-tab="anno-tab-l1">L1</button>
    <button class="anno-tab" data-tab="anno-tab-l2">L2</button>
    <button class="anno-tab" data-tab="anno-tab-l3">L3</button>
    <button class="anno-tab" data-tab="anno-tab-l4">L4</button>
    <button class="anno-tab" data-tab="anno-tab-l5">L5</button>
    <button class="anno-tab" data-tab="anno-tab-l6">L6</button>
  </div>
  <div class="anno-drawer-body">
    <div class="anno-tab-content active" id="anno-tab-l0">
      <!-- L0: Page Overview content here -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l1">
      <!-- L1: Field Details content here -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l2">
      <!-- L2: Business Rules content here -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l3">
      <!-- L3: State Machine content here (or placeholder) -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l4">
      <!-- L4: API Contracts content here -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l5">
      <!-- L5: Performance Notes content here (or placeholder) -->
    </div>
    <div class="anno-tab-content" id="anno-tab-l6">
      <!-- L6: Open Questions content here -->
    </div>
  </div>
  <div class="anno-drawer-resize" id="annoResize"></div>
</div>
```

## CSS

```css
/* ── Annotation Drawer ── */
.anno-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s var(--transition-easing);
}
.anno-drawer.open { transform: translateX(0); }

.anno-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border);
}
.anno-drawer-title { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); }
.anno-drawer-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); }
.anno-drawer-close:hover { color: var(--text); }

.anno-drawer-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 var(--spacing-xs);
  gap: 2px;
  flex-shrink: 0;
}
.anno-tab {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--text-tertiary);
  transition: all var(--transition-duration);
}
.anno-tab:hover { color: var(--primary); }
.anno-tab.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: var(--font-weight-medium); }

.anno-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}
.anno-tab-content { display: none; }
.anno-tab-content.active { display: block; }
.anno-placeholder { color: var(--text-tertiary); font-style: italic; font-size: var(--font-size-sm); }

.anno-drawer-resize {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
}
.anno-drawer-resize:hover { background: var(--primary-bg); }

/* ── Annotation Badges ── */
.annotation-badge {
  display: none;
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-circle);
  background: var(--primary);
  color: #fff;
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  z-index: 100;
}
.anno-drawer.open ~ .has-annotation .annotation-badge,
.anno-drawer.open .annotation-badge { display: inline-flex; }
.has-annotation { position: relative; }
```

## JavaScript

```javascript
(function() {
  var drawer = document.getElementById('annoDrawer');
  var closeBtn = document.getElementById('annoClose');
  var resizeHandle = document.getElementById('annoResize');
  var tabs = drawer.querySelectorAll('.anno-tab');
  var contents = drawer.querySelectorAll('.anno-tab-content');

  // Toggle: Ctrl+B
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      drawer.classList.toggle('open');
      updateBadges();
    }
  });

  // Close: Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      updateBadges();
    }
  });

  // Close button
  closeBtn.addEventListener('click', function() {
    drawer.classList.remove('open');
    updateBadges();
  });

  // Tab switching
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('active'); });
      contents.forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
    });
  });

  // Resize
  var isResizing = false;
  resizeHandle.addEventListener('mousedown', function(e) {
    isResizing = true;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    var newWidth = window.innerWidth - e.clientX;
    drawer.style.width = Math.max(280, Math.min(600, newWidth)) + 'px';
  });
  document.addEventListener('mouseup', function() { isResizing = false; });

  // Badge visibility
  function updateBadges() {
    var badges = document.querySelectorAll('.annotation-badge');
    badges.forEach(function(b) {
      b.style.display = drawer.classList.contains('open') ? 'inline-flex' : 'none';
    });
  }
})();
```
