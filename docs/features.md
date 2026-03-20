## Features

### Dashboard

- Daily budget calculated from available checking/savings balance
- Personal greeting with today's spending (personal + household)
- AI-generated financial summary with skeleton loading and refresh
- Spending flow hero chart with gradient line (green/yellow/red), projected spending, savings target line, and status bubble
- Spending chart (cumulative, excludes transfers) with savings target dashed line
- Category breakdown pie chart
- Monthly cash flow bar chart (current + 3 historical months)
- Recent transactions list (excludes transfers)
- Net worth section with investments and debts
- Entry reminder after 6 hours of no new transactions
- Burn rate and projected month-end balance
- Personal budget share with configurable % or auto-calculated from spending history
- Configurable decimal places (0-2) for all euro amounts
- Sync button with relative last-sync time

### AI advisor

- Chat interface with persistent message history (SQLite)
- Real-time message delivery via SSE
- Typing indicators between users
- Markdown rendering with bold amounts in indigo
- Comma decimal separators in Finnish mode
- Full YNAB financial context in every prompt (balance, transactions, bills, debts, income)
- Household profile and editable AI prompts
- Current date/time awareness
- Shared chat visible to all household members
- Sender names on message bubbles
- Three bubble styles: self (right), other user (left, warm), AI (left, cool)

### Transactions

- Real-time sync from YNAB API
- Filter by all, expenses, income, transfers
- Search by payee or category
- Add missing expense with AI auto-categorization
- Description/memo field
- Unread indicator dot when new data synced

### Bills

- Add/edit/delete recurring bills
- Due day tracking with overdue and due-soon badges
- Manual paid/unpaid toggle (persists per month)
- YNAB payee matching for automatic paid detection
- Amount difference display when actual differs from expected
- Average amount from history (2+ months)
- Bill amount history tracking

### Income

- Add/edit/delete income sources
- Day 0 = last day of month
- YNAB payee matching with wildcard patterns
- Received badge when matched to YNAB transaction
- Amount history and averages
- Single total card (no recurring/non-recurring distinction)

### Debts

- Auto-populated from YNAB otherDebt accounts
- Editable interest rates and monthly payments
- Snowball and avalanche payoff strategies with charts
- AI debt payoff suggestion
- Debt list on dashboard

### Investments

- Auto-populated from YNAB otherAsset accounts
- Editable monthly contribution amount and expected return percentage
- Compound growth projection chart with configurable time horizon
- Shows monthly transfers already made this month
- Monthly contributions included in dashboard month status

### Net worth

- Snapshot history with area chart
- Auto-snapshot on every YNAB sync
- Investments, accounts, debts breakdown
- Manual snapshot button

### Settings

- User profile: name, linked spending account
- Language: English and Finnish with live switching
- Decimal places: 0-2 decimals for euro amounts (default 0, display-only)
- Household: size, description for AI, saving goal
- YNAB: connect/disconnect, budget selection, sync
- AI prompts: editable chat guidelines, summary instructions, debt advice
- All settings shared across household (except language and name)

### Real-time

- Server-Sent Events (SSE) for instant updates
- Chat messages, typing indicators, sync notifications
- Dashboard auto-refreshes when data changes
- Unread badges on sidebar for chat and transactions
- No extra services needed (in-process EventBus)

### Payee matching

- Link income sources and bills to YNAB payees
- Wildcard patterns: `*Dude*`, `Elisa*`, `*Oy`
- Auto-match on every YNAB sync
- Prevents double-counting of received income

### Internationalization

- English and Finnish
- Per-user language preference
- All UI labels, headings, badges translated
- AI responds in user's language
