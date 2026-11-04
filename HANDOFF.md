# Handoff
Updated: 2026-11-04 by Claude Code
Branch: profile-settings (not pushed, no PR yet)
Plan: docs/plans/04-profile-settings.md — 19/19 steps built + verified, Status: done

## In progress
Nothing.

## Next step
User: `/design-sync` (new Field, Avatar, Dialog; Button danger/quiet; tokens data-theme; EloScore/HistoryEntry i18n),
then manual check in `npm run dev` (list below), then push + PR.

## Broken / open questions
- Manual checks not done by agents: en/uk on every screen; theme no-flash on reload + «Системная» follows OS;
  photo on iPhone (large JPEG, HEIC, rotation); Dialog Esc/Tab/focus restore; clear-all-data wipes + reloads;
  v2→v3 DB upgrade keeps existing data.
- No DOM test env: Dialog focus, clear flow and IndexedDB ops are untested; only Profile has a render smoke test.
- Light-theme danger button contrast is 4.51:1 (just AA); darkening --neg would break it.
- Carried from before: open product questions in product context §13; HistoryEntry «±100» note; Vercel deploy postponed.
