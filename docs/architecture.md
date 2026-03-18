## Architecture

### Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI primitives**: @base-ui/react (headless components)
- **CSS**: Custom SMACSS-derivative framework (`src/styles/`)
- **Database**: SQLite via better-sqlite3
- **Auth**: JWT sessions with httpOnly cookies
- **Icons**: lucide-react
- **Charts**: Recharts
- **i18n**: Custom locale system with React context

### Directory structure

```
src/
  app/                    # Next.js app router pages
    (app)/                # Authenticated app pages (dashboard, chat, etc.)
    api/                  # API routes (auth, ynab, chat)
    login/                # Public login page
  components/
    ui/                   # Reusable UI components (button, card, input, etc.)
    layout/               # App shell and sidebar
    dashboard/            # Dashboard-specific components
    chat/                 # Chat interface
  lib/
    auth.ts               # JWT session management
    db.ts                 # SQLite database connection
    i18n/                 # Translation files (en.ts, fi.ts)
    locale-context.tsx    # React context for locale
    ynab/                 # YNAB API client
  styles/
    theme.css             # CSS custom properties (light/dark)
    base.css              # Resets, typography
    animations.css        # Keyframes (enter/exit/spin/countUp)
    state.css             # State classes (.is-active, .is-hidden)
    layout.css            # App shell, sidebar, layout utilities
    modules/              # Per-component CSS modules
    index.css             # Single entry point
```

### CSS naming convention

- Module root: `.card`, `.button`, `.dialog`
- Sub-elements: `.card-header`, `.card-title`
- Layout: `.l-app-shell`, `.l-sidebar`, `.l-page-container`
- State: `.is-active`, `.is-disabled`, `.is-loading`
- Variants: `[data-variant="outline"]`, `[data-size="sm"]`
- Overrides use compound selectors: `.card.metric-card`

### Authentication flow

1. User submits credentials to `POST /api/auth/login`
2. Server validates against SQLite, returns JWT in httpOnly cookie
3. Middleware (`middleware.ts`) checks JWT on every request
4. Unauthenticated requests redirect to `/login`
5. Cookie uses `SameSite=lax`, no `Secure` flag (HTTPS via Cloudflare tunnel)

### Deployment

- Runs as systemd user service (`dough.service`)
- Exposed via Cloudflare tunnel (`dough-tunnel.service`)
- Domain: dough.rolle.wtf
- Build: `npm run build` then `systemctl --user restart dough.service`
