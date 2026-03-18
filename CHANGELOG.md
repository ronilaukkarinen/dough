### 0.2.0: 2026-03-18

* Replace Tailwind CSS with custom SMACSS-derivative CSS framework
* Create theme, base, animations, state, layout foundation CSS files
* Create CSS modules for all 17 UI components
* Create CSS modules for dashboard, chat, and page components
* Migrate app-shell and sidebar to semantic `.l-` layout classes
* Migrate all UI components from Tailwind utility classes to module CSS
* Remove CVA (class-variance-authority), use `data-variant` and `data-size` attributes
* Simplify `cn()` utility to use `clsx` only, remove `tailwind-merge`
* Migrate all page components (dashboard, transactions, bills, income, debts, settings, chat) to custom CSS
* Extract login styles from globals.css to `modules/login.css`
* Remove globals.css, Tailwind PostCSS plugin, components.json
* Uninstall `tailwindcss`, `@tailwindcss/postcss`, `tailwind-merge`, `tw-animate-css`, `shadcn`, `class-variance-authority`
* Fix login form on Safari iOS by using uncontrolled inputs with FormData to handle autofill
* Fix Safari iOS login redirect by using window.location instead of router.push
* Fix Safari iOS cookie not persisting by removing Secure flag (HTTPS handled by Cloudflare tunnel)
* Add mobile responsive layout with hamburger menu and off-canvas sidebar
* Make all page grids, dashboard cards, lists, and charts stack on mobile
* Reduce padding and hide list icons on small screens for better space usage
* Make category breakdown legend stack below donut on mobile
* Add iOS safe area viewport-fit and tap highlight removal
* Fix CSS specificity for card, badge, input, and button overrides using compound selectors
* Fix YNAB settings to show budget ID field when connected
* Add disconnect YNAB button in settings
* Add `ynab_budget_id` to session user profile
* Fix update API to handle clearing YNAB token and budget ID
* Remove all static inline styles, replace with CSS classes per CLAUDE.md rules
* Add architecture and CSS framework documentation
* Fix mobile proportions: increase card padding, hero text size, list item spacing, show list icons on mobile
* Complete Finnish translations for all page components, dashboard, chat, settings, and UI labels
* Add ~60 new translation keys covering bills, income, debts, settings, chat errors, and dashboard labels
* Add proper CSS reset for buttons, inputs, headings (missing from Tailwind Preflight replacement)
* Increase button, input, and select sizes for better touch targets
* Increase metric card value font size from 1.5rem to 1.75rem
* Fix sidebar logout button rendering as white by resetting native button styles
* Wire real YNAB data to dashboard replacing all demo data
* Wire real YNAB data to transactions page
* Add YNAB context provider for shared data across all pages
* Add auto-sync on app load when YNAB is connected
* Show relative dates on transactions (today, yesterday, 3 days ago)
* Rewrite YNAB client to use REST API directly for reliability
* Fix available balance to show checking+savings total instead of YNAB toBeBudgeted
* Fix AI chat by resolving claude CLI path and wiring real YNAB data as context
* Remove all hardcoded demo data from chat API route

### 0.1.0: 2026-03-18

* Wire i18n locale context so language switch updates sidebar and all page headings live
* Add YNAB budget ID field to settings page
* Load user settings from database on page load so they persist across refreshes
* Wire sync now button to call YNAB sync API with user's token
* Fix card gap between header and content in settings cards
* Add copilot.money style button hover effects with glow and scale
* Fix manifest.json redirect by excluding static files from auth middleware
* Fix chart width/height warnings with mounted check wrapper
* Fix cash flow chart tooltip cursor for dark theme
* Wire YNAB connect button to save token to user profile
* Wire language select to persist preference
* Remove display name field from settings
* Use sentence case for all headings and labels
* Use European style euro format with space before sign
* Remove comma thousand separators from numbers
* Make settings card headings more compact
* Add user profile update API endpoint
* Fix better-sqlite3 Node version mismatch by pinning systemd service to nvm Node v22
* Add better-sqlite3 to serverExternalPackages in next.config.ts
* Add Outfit font for headings, Inter for body text
* Add favicon with white $ on midnight blue background
* Use stronger generated passwords for users
* Fix font not loading by setting Inter directly in theme
* Fix manifest.json syntax error by removing missing icon references
* Remove logo avatar and branding from login and sidebar
* Redesign login page to match copilot.money style
* Change usernames to rolle and mustikkasoppa
* Replace Supabase with local SQLite database and cookie-based auth
* Switch AI chat from Anthropic API to claude CLI for Claude Max usage
* Add seed script for creating users
* Initial release of Dough personal finance app
* Add dashboard with daily budget, spending chart, category breakdown, cash flow and recent transactions
* Add AI financial advisor chat
* Add transactions page with search and filters
* Add recurring bills management with due date tracking
* Add income sources tracking with expected dates
* Add debt tracker with snowball and avalanche payoff strategies
* Add settings page with profile, language and YNAB connection
* Add YNAB API client for budget, transactions and month data sync
* Add English and Finnish language support
* Add dark theme inspired by copilot.money design
* Add PWA manifest for home screen installation
