### 0.2.0: 2026-03-18

* Add custom SMACSS-derivative CSS framework alongside Tailwind
* Create theme, base, animations, state, layout foundation CSS files
* Create CSS modules for all UI components and page components
* Simplify `cn()` utility to use `clsx` only, remove `tailwind-merge`

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
