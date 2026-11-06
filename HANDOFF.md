# Handoff
Updated: 2026-11-06 by Claude Code
Branch: auth-sync (PR #5) — origin/main (PR #4 profile/settings/i18n) merged in
Plan: docs/plans/06-auth-sync-integration.md — done (7/7). Tests/lint/build green (1 lint warning: src/i18n/index.tsx, from main).
## In progress
Nothing uncommitted.
## Next step (user)
1. `npx supabase db push --remote` (2 new migrations: 20261105000000_records_profile, 20261106000000_reset_tombstones).
2. Clear site data on localhost once (Dexie sync tables are v4; old v3 outbox build breaks otherwise).
3. Run `/design-sync`, write HEAD hash to `.design-sync/last-sync`, commit.
4. Merge PR #5, then deploy on Vercel (docs/setup/backend.md §7), run the §8 checklist.
## Broken / open questions
- KNOWN ISSUE (deferred): password-reset email does not arrive (Resend test sender). Check Resend → Emails,
  Supabase → Logs → Auth.
- Unverified: Cyrillic-only password passes our check but Supabase `letters_digits` policy may reject it.
- Not verified yet: Google in iOS PWA, logout wipe, offline edit, Vercel deploy.
- User decisions pending: all-unknown review lifts negative rating (§6.5, v2?); A's leftover data → empty account B
  without confirm; «Не помню текущий пароль» hint vs sign-out hand-off.
