# Handoff
Updated: 2026-11-06 by Claude Code
Branch: auth-sync (PR #5) — origin/main (PR #4 profile/settings/i18n) merged in
Plan: docs/plans/06-auth-sync-integration.md, step 1 of 7 (plan 05 auth-sync: built, manual E2E partly done)
## In progress
Nothing uncommitted.
## Next step
/build-plan docs/plans/06-auth-sync-integration.md all
## Broken / open questions
- Merge resolution is mechanical: auth/sync UI strings still hardcoded Russian, TextField duplicates Field,
  profile not synced, «Удалить все данные» gets re-downloaded from the server — all covered by plan 06.
- Dexie: sync tables are v4 now. A browser that ran the old auth-sync build (v3 = outbox) needs site data
  cleared on localhost once.
- KNOWN ISSUE (deferred): password-reset email does not arrive (Resend test sender). Check Resend → Emails,
  Supabase → Logs → Auth.
- Not verified yet: Google in iOS PWA, logout wipe, offline edit, Vercel deploy.
- /design-sync waits until plan 06 step 4 (Field/PasswordField); remote currently matches main (last-sync 9f27464).
- User decisions pending: all-unknown review lifts negative rating (§6.5, v2?); A's leftover data → empty account B
  without confirm; «Не помню текущий пароль» hint vs sign-out hand-off.
