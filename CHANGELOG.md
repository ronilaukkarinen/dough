### 0.3.0: 2026-03-18

* Fix metric card value font sizes to be consistent across all dashboard cards
* Fix AI advisor by removing unsupported --no-input flag from claude CLI call
* Make category breakdown pie chart larger (200px, bigger radii)
* Replace burger menu icon with PanelLeft for modern look
* Reduce mobile page padding for better space usage
* Align mobile top bar button more to the left
* Fix transaction amount spacing (remove space between sign and number)
* Remove all hardcoded demo data from bills, income and debts pages
* Add AI financial summary to dashboard with daily cache and manual refresh
* Support both English and Finnish summaries stored separately
* Fix euro sign rendering as \u20AC escape in chart tooltips and page components
* Add persistent chat messages saved to SQLite database
* Load chat history on page mount, save new messages automatically
* Add clear chat button with trash icon
* Fix pie chart legend overlap by adding gap, truncation and nowrap on amounts
* Make pie chart larger on mobile (220px)
* Increase legend amount font weight to 600
* Fix spending chart by filtering out transfer transactions between accounts
* Fix spending chart Y-axis width to prevent truncated labels
* Fix spending chart budget line to use actual spending pace instead of inflated total
* Add global .icon-sm utility class for consistent small icon sizing
* Fix Finnish translation for bills still due ("Erääntyy ennen kuun loppua")
* Fix Finnish debt subtitle ("Seuraa ja lyhennä velkojasi")
* Normalize all currency values to xxxxx.xx € format across all pages
* Fix NaN% in debts progress when no debts exist
* Sync debts from YNAB otherDebt type accounts automatically
* Add sync button and relative last sync time to dashboard header
* Make pie chart fill container (320px max, radii 85/140)
* Move sync time next to button in compact format
* Add net worth section to dashboard with investments, accounts and debts breakdown
* Add investment account list from YNAB otherAsset accounts
* Add netWorth, accounts, investments i18n keys for EN and FI
* Replace chat spinner with bouncing dots typing indicator
* Remove chat clear/trash button
* Don't save error messages to chat history
* Add polling so AI response persists even if you navigate away
* Save AI chat responses to database server-side for reliability
* Increase claude CLI timeout to 120 seconds for both chat and summary
* Switch from Outfit+Inter to Geist font family for modern 2026 aesthetic
* Update color palette to indigo/violet primary with deeper dark theme
* Add glassmorphism card styling with backdrop blur and subtle borders
* Add tabular-nums and tighter letter-spacing on all metric values
* Update all chart colors to match new palette
* Update login page to use new theme tokens and cleaner styling
* Fix AI chat and summary by piping prompts via stdin instead of CLI arguments
* Fix pie chart category rendering with fixed donut container dimensions
* Redesign to 2026 minimal aesthetic inspired by Linear/copilot.money
* Remove all icon background boxes, use bare colored icons everywhere
* Remove visible card borders, use transparent/glass backgrounds
* Make daily budget hero number larger (3.5rem desktop) with tighter letter-spacing
* Add uppercase small-caps labels with letter-spacing on all section headings
* Add tabular-nums and font-variant-numeric across all metric values
* Make legend dots square (2px radius) instead of circles
* Reduce all mobile card padding for tighter layout
* Update page headings to be larger and bolder
* Simplify button hover to subtle glow instead of complex inset shadows
* Filter transfers from income calculations in dashboard, chat and AI summary
* Add copy-to-clipboard button on AI summary card
* Fix duplicate net worth heading, follow hero design pattern
* Fix Finnish translation "Tulonlähteet"

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
* Fix daily budget to use checking+savings balance instead of YNAB toBeBudgeted
* Unify metric card value font sizes across mobile and desktop
* Replace dollar sign favicon with euro coin icon

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
