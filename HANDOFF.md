# Handoff
Updated: 2026-11-06 by Claude Code
Branch: auth-sync (PR #5) — origin/main (PR #4 profile/settings/i18n) merged in
Plan: docs/plans/06-auth-sync-integration.md — done (7/7). Tests/lint/build green (1 lint warning: src/i18n/index.tsx, from main).
## In progress
Nothing uncommitted.
## Next step (user)
1. ~~db push~~ done 2026-11-07 (records_profile, reset_tombstones applied to LifeElo).
2. Clear site data on localhost once (Dexie sync tables are v4; old v3 outbox build breaks otherwise).
3. ~~/design-sync~~ done 2026-11-07 (Notice, PasswordField added; Field updated).
4. Merge PR #5, then deploy on Vercel (docs/setup/backend.md §7), run the §8 checklist.
## Broken / open questions
- KNOWN ISSUE (deferred): password-reset email does not arrive (Resend test sender). Check Resend → Emails,
  Supabase → Logs → Auth.
- Unverified: Cyrillic-only password passes our check but Supabase `letters_digits` policy may reject it.
- Not verified yet: Google in iOS PWA, logout wipe, offline edit, Vercel deploy.
- 2026-11-07: server is the source of truth; sign-in drops non-matching local data and pulls (no upload, no choice
  screen). Pre-account data on the user's iPhone is intentionally not migrated.
  (All-unknown review vs negative rating: kept as is, logged in product context §13 Open.)
