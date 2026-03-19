## API reference

All endpoints require authentication via `dough-session` cookie (except `/api/auth/login` and `/api/auth/logout`).

### Authentication

- `POST /api/auth/login` — login with email + password, sets session cookie
- `GET /api/auth/logout` — clears session cookie, redirects to /login
- `GET /api/auth/me` — returns current user profile
- `POST /api/auth/update` — update user locale, YNAB settings

### Household settings

- `GET /api/household` — get shared household settings (YNAB connection, saving rate, prompts, household profile)
- `POST /api/household` — update household settings (key-value pairs)

### Profile

- `GET /api/profile` — get user profile and linked account IDs
- `PUT /api/profile` — update display name or linked accounts

### YNAB

- `POST /api/ynab/sync` — sync YNAB data (accounts, transactions, month budget), auto-takes net worth snapshot and runs payee matching
- `GET /api/ynab/accounts` — list checking/savings accounts
- `GET /api/ynab/budgets` — list available budgets
- `GET /api/ynab/categories` — list budget categories
- `POST /api/ynab/transaction` — create a new transaction in YNAB (with AI auto-categorization)

### Income

- `GET /api/income` — list all income sources with averages
- `POST /api/income` — create income source
- `PUT /api/income` — update income source or toggle active
- `DELETE /api/income` — delete income source

### Bills

- `GET /api/bills` — list bills with paid status, patterns, averages, overdue detection
- `POST /api/bills` — create bill
- `PUT /api/bills` — update bill, toggle active, or mark paid/unpaid
- `DELETE /api/bills` — delete bill

### Debts

- `GET /api/debts` — list debts from YNAB with overrides and AI suggestions
- `PUT /api/debts` — save interest rate and payment overrides
- `GET /api/debts/suggestion` — AI debt payoff suggestion

### Net worth

- `GET /api/net-worth` — list snapshots
- `POST /api/net-worth` — take a new snapshot

### Chat

- `GET /api/chat/messages` — list all shared chat messages
- `POST /api/chat/messages` — save a message
- `DELETE /api/chat/messages` — clear all messages
- `POST /api/chat` — send message to AI advisor, returns AI response
- `GET /api/chat/typing` — get typing users
- `POST /api/chat/typing` — broadcast typing status
- `GET /api/chat/unread` — get unread count for current user
- `POST /api/chat/unread` — mark all as read

### Payee matching

- `GET /api/matches` — list patterns and monthly matches
- `POST /api/matches` — add a payee pattern
- `DELETE /api/matches` — remove a pattern

### AI summary

- `GET /api/summary?locale=fi&refresh=1` — get or generate AI financial summary

### SSE events

- `GET /api/events` — Server-Sent Events stream

Event types: `chat:message`, `chat:typing`, `sync:complete`, `data:updated`

### Transactions

- `GET /api/transactions/unread` — check if new transactions since last visit
- `POST /api/transactions/unread` — mark as seen
