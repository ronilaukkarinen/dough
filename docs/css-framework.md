## CSS framework

### Overview

Custom SMACSS-derivative CSS framework replacing Tailwind CSS. All styles live in `src/styles/`.

### File structure

- `theme.css` — CSS custom properties for light and dark modes
- `base.css` — Resets, typography, scrollbar, screen reader utilities
- `animations.css` — Keyframes (enter, exit, spin, countUp) and animation classes
- `state.css` — Global state classes (.is-active, .is-disabled, .is-loading, .is-hidden)
- `layout.css` — App shell, sidebar, top bar, page container, layout utilities
- `modules/` — One CSS file per UI component and page component
- `index.css` — Single import entry point

### Variant pattern

Components use `data-variant` and `data-size` attributes instead of CVA:

```tsx
<Button data-variant="outline" data-size="sm" className="button" />
```

```css
.button[data-variant="outline"] { ... }
.button[data-size="sm"] { ... }
```

### Override pattern

Page-specific card styles use compound selectors to beat base component specificity:

```css
/* Base: specificity 0-1-0 */
.card { padding-top: 1rem; }

/* Override: specificity 0-2-0, always wins */
.card.metric-card { padding: 1.5rem; }
```

### Responsive breakpoints

- `640px` — Small (sm): filter bars go horizontal, summary grids 2-col
- `768px` — Medium (md): sidebar visible, desktop padding, dashboard grids
- `1024px` — Large (lg): chart grids go 2-col

### Dark mode

All colors use CSS custom properties defined in `theme.css`. Dark mode is always active (`className="dark"` on html). Variables switch values under `.dark` selector.

### Utility classes

- `.text-positive`, `.text-negative`, `.text-foreground`, `.text-muted` — text colors
- `.w-full` — full width
- `.capitalize` — text-transform
- `.sr-only` — screen reader only
- `.animate-spin`, `.animate-in`, `.animate-out` — animations
