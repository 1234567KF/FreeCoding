# Appendix A: CSS Variable Library

Copy this verbatim into the `<style>` block of every generated prototype (or into `shared.css` for multi-page mode). A single clean design system — all colors, spacing, and typography defined as CSS custom properties on `:root`.

```css
:root {
  /* ── Brand Colors ── */
  --primary: #1677ff;
  --primary-hover: #4096ff;
  --primary-active: #0958d9;
  --primary-bg: #e6f4ff;

  /* ── Functional Colors ── */
  --success: #52c41a;
  --success-bg: #f6ffed;
  --warning: #faad14;
  --warning-bg: #fffbe6;
  --error: #ff4d4f;
  --error-bg: #fff2f0;
  --info: #1677ff;
  --info-bg: #e6f4ff;

  /* ── Neutral Colors ── */
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

  /* ── Typography ── */
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

  /* ── Spacing ── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* ── Border Radius ── */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-round: 32px;
  --radius-circle: 50%;

  /* ── Shadow ── */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px 0 rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 20px 0 rgba(0, 0, 0, 0.10);
  --shadow-xl: 0 12px 40px 0 rgba(0, 0, 0, 0.14);

  /* ── Layout ── */
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
