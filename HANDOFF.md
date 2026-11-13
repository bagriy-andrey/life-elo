# Handoff
Updated: 2026-11-13 by Claude Code
Branch: garmin-all-data (on top of garmin-sync-status / PR #15)
Plan: docs/plans/17-garmin-day-page.md — done, v0.17.0 (migration applied, garmin-pull v4 deployed, schema checked).
## In progress
Nothing uncommitted. PR open for garmin-all-data (contains PR #15 too).
## Next step (user)
1. Merge → Vercel → open the app on every device (Dexie v6; v5 devices show «update-app» once a v6 client pushes).
2. Профиль → Garmin → «Синхронизировать сейчас» → «Посмотреть данные синхронизации» → tap a day → day page.
3. Eyeball 375px light/dark: day page sections, charts, «Все поля». `/design-sync` still pending (TabBar).
## Broken / open questions
- Fitness age item exists but the endpoint isn't fetched. Lint: 3 pre-existing react-refresh warnings.
