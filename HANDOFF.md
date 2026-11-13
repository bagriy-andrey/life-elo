# Handoff
Updated: 2026-11-13 by Claude Code
Branch: garmin-sync-status (from main)
Plan: docs/plans/16-garmin-data-view.md — done, v0.16.0 (plans 14, 15 done; fix 0.15.1: records upsert via RPC, applied + deployed).
Server is live: migrations vault + status applied, garmin-connect/garmin-pull v2 deployed; key+token moved to Vault (checked).
## In progress
Nothing uncommitted. PR open for garmin-sync-status.
## Next step (user)
1. Merge PR → Vercel deploy → open the app (every device).
2. Профиль → Garmin → «Синхронизировать сейчас»: expect a fresh «Последняя синхронизация»; on failure the stage
   (token/garmin/db/unknown) is shown — report it. Likely old cause: 5 s client timeout (now 20 s, parallel calls).
3. Next morning: review status line (complete / partial / no data) + «Обновить».
4. Manual 375px light/dark check of the new status line and Profile section. `/design-sync` still pending (TabBar).
## Broken / open questions
- Minor: garmin_upsert_secret is executable by service_role via Supabase default grants (plan said none) — server-only, acceptable.
- Lint: 3 pre-existing react-refresh warnings.
