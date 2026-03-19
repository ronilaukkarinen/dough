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
- **AI**: Claude CLI via stdin pipe
- **Real-time**: Server-Sent Events (in-process EventBus)
- **Finance data**: YNAB REST API

### Directory structure

```
src/
  app/                    # Next.js app router pages
    (app)/                # Authenticated app pages
    api/                  # API routes
    login/                # Public login page
  components/
    ui/                   # Reusable UI components
    layout/               # App shell, sidebar
    dashboard/            # Dashboard components (greeting, charts, net worth, etc.)
    chat/                 # Chat interface
  lib/
    auth.ts               # JWT session management
    db.ts                 # SQLite database + schema init
    event-bus.ts          # In-memory pub/sub for SSE
    use-events.ts         # Client-side SSE hook
    household.ts          # Shared household settings helpers
    matching.ts           # YNAB payee matching engine
    transaction-utils.ts  # Transfer detection helpers
    date-utils.ts         # Date formatting (Finnish format, relative dates)
    locale-context.tsx    # React context for i18n
    ynab-context.tsx      # React context for YNAB data
    ai/
      finance-advisor.ts  # Claude CLI integration for chat
      default-prompts.ts  # Default AI prompt templates
    ynab/
      client.ts           # YNAB REST API client
    i18n/
      en.ts, fi.ts        # Translation files
  styles/
    theme.css             # CSS custom properties (light/dark)
    base.css              # Resets, typography, focus styles
    animations.css        # Keyframes
    state.css             # State classes
    layout.css            # App shell, sidebar, page layout
    modules/              # Per-component CSS modules
    index.css             # Single entry point
scripts/
  seed.ts                 # User creation script
docs/                     # Documentation
data/                     # SQLite database (gitignored)
```

### Database tables

- `users` — user accounts with locale, linked YNAB credentials
- `user_linked_accounts` — per-user linked YNAB spending accounts
- `household_settings` — shared key-value settings (YNAB, saving rate, AI prompts, etc.)
- `recurring_bills` — monthly recurring bills
- `bill_amount_history` — bill amount tracking per month
- `bill_manual_status` — manual paid/unpaid overrides per month
- `income_sources` — income sources with expected day
- `income_amount_history` — income amount tracking per month
- `debt_overrides` — manual interest rate and payment overrides
- `investment_overrides` — monthly contribution and expected return overrides for YNAB investment accounts
- `payee_matches` — YNAB payee patterns for matching
- `monthly_matches` — matched transactions per source per month
- `chat_messages` — shared chat history
- `chat_last_seen` — per-user read tracking
- `typing_status` — real-time typing indicators
- `transactions_last_seen` — per-user transaction read tracking
- `net_worth_snapshots` — daily net worth history
- `monthly_snapshots` — monthly income/expenses/categories history for trends and cash flow chart
- `ai_summaries` — cached AI summaries per locale

### Data flow

1. YNAB sync fetches accounts, transactions, month budget
2. Data cached in YNAB context (React state, not DB)
3. Auto-match runs against payee patterns
4. Net worth snapshot saved to DB
5. SSE broadcasts `sync:complete` to all clients
6. All connected dashboards re-fetch and update

### AI integration

Claude CLI is invoked via `spawn` with stdin pipe. Three AI features:

1. **Chat advisor** — full conversation with financial context
2. **Daily summary** — cached 24h, includes income/expense/burn rate
3. **Debt suggestion** — one-shot advice on debt prioritization

All prompts are editable via settings. Household profile injected into every prompt.

### Authentication flow

1. User submits credentials to `POST /api/auth/login`
2. Server validates against SQLite, returns JWT in httpOnly cookie
3. Middleware checks JWT on every request
4. Unauthenticated requests redirect to `/login`
5. Logout via GET redirect clears cookie server-side

### CSS naming convention

- Module root: `.card`, `.button`, `.dialog`
- Sub-elements: `.card-header`, `.card-title`
- Layout: `.l-app-shell`, `.l-sidebar`, `.l-page-container`
- State: `.is-active`, `.is-disabled`, `.is-paid`
- Variants: `[data-variant="outline"]`, `[data-size="sm"]`
- Overrides use compound selectors: `.card.metric-card`
