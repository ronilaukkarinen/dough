## Commits and code style

- Never use commas or dots as thousand separators, use full numbers like 10000 and 20000
- Use dots as decimal separators
- Never use ISO dates (2026-03-10) in human readable labels in UI unless programmatically required. Use Finnish format without leading zeros: d.m.yyyy (e.g. 10.3.2026)
- Always commit build and asset files
- One logical change per commit
- Keep commit messages concise (one line), use sentence case
- Update CHANGELOG.md after each change
- Use present tense in commits and CHANGELOG.md
- Use sentence case for headings (not Title Case)
- Never use bold text as headings, use proper heading levels instead
- Always add an empty line after headings
- No formatting in CHANGELOG.md except `inline code` and when absolute necessary
- Use `*` as bullets in CHANGELOG.md
- Never use Claude watermark in commits (FORBIDDEN: "Co-Authored-By")
- No emojis in commits or code
- Keep CHANGELOG.md date up to date when adding entries
- Do not ever use separators like ============================================================ or headings like === Something ===

## Claude Code workflow

- ALWAYS use Helsinki timezone (Europe/Helsinki) for all timestamps. External APIs (Mastodon, Threads, etc.) return UTC - always convert to Helsinki before storing. The server runs in Helsinki timezone but API data does not. Compare like with like: if `datetime.now()` is Helsinki, stored timestamps must also be Helsinki.
- NEVER add Finnish language, examples, in anywhere, or in prompts unless the feature requires Finnish parsing (e.g. reminder time extraction)
- NEVER unsolicited clean up, replace, or wipe data/words from files, logs, or any stored data.
- NEVER cap with artificial limits, truncate sentences, or do hard clips and cuts as a "solution".
- NEVER add arbitrary "just in case" limits
- Always add tasks to the Claude Code to-do list and keep it up to date.
- Review your to-do list and prioritize before starting.
- If new tasks come in, don’t jump to them right away—add them to the list in order of urgency and finish your current work first. Use FIFO (First in First out) in order.
- Do not ever guess features, always proof them via looking up official docs, GitHub code, issues, if possible.
- When looking things up, do not use years in search terms like 2024 or 2025.
- NEVER just patch the line you see. Before fixing, trace the full chain: check all related prompts, Python code, and callers. This is a large codebase with many interconnected prompt files and systems. Be comprehensive.
- ALWAYS prefer CSS classes over inline `style=""` attributes. Only use inline styles for truly dynamic values (JS-computed colors, display:none toggled by JS). Static visual properties must be CSS classes.
- Prefer DRY code - avoid repeating logic, extract shared patterns

## Common tasks

Always work on tasks in order. Always use todo. Always show user the todo of tasks in progress.
CRITICAL: Always update CHANGELOG, commit and restart after changes.

## Commits

- Never add Claude watermark
- Always concise, single line commits
- Always commit ALL files including logs, runtime files and json files (git add -A)
- Always run `git status` after committing to verify nothing is left uncommitted

## Changelog

- Always update CHANGELOG.md, check todays date
- Never use formatting in changelog
- Use present tense in changelog
- Be concise, no repetition, one line per change
- Always use changelog formatting: ### x.x.x: yyyy-mm-dd with headings, no main "Changelog" heading, no sub headings
- Always use * as bullets in changelog
- One version per day: all changes on the same day go under one version number

## Logging

- Always add verbose logging to every feature at every step: debug, info, warning, error
- Every function should log on entry (debug), key decisions (debug/info), success (info), and failures (warning/error)
- When adding new features, verify logging coverage before committing

## Documentation

- Keep `docs/*.md` up to date when changing features
- Update relevant docs within each change, do not let docs fall behind
- Documentation lives in `docs/`
- Use sentence case for headings
- Use proper heading levels, never bold text as headings
- Always add an empty line after headings
- No emojis in documentation
- Do not ever use separators like ============================================================ or headings like === Something ===
