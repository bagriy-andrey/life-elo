# Handoff
Updated: 2026-11-04 by Claude Code
Branch: auth-sync
Plan: docs/plans/04-auth-sync.md, steps 1–13 ticked; step 13 FAILED re-verify (fix round used), 14–15 open
## In progress
Nothing uncommitted.
## Next step
Fix step 13 logout (2 CRITICAL), re-verify, then /build-plan docs/plans/04-auth-sync.md all (steps 14–15).
1. src/auth/AuthProvider.tsx signOut: local-scope signOut removes the session but returns {error} offline
   (AuthRetryableFetchError, status 0) → treat as success when session is gone / error is retryable; test it.
2. src/sync/logout.ts: on failed signOut call engine.enable() (sync stays disabled otherwise); test run() works after.
## Broken / open questions
- Manual checks pending (need Supabase project + `db push`): steps 7, 8, 11, 12, 13; Google↔email linking note in docs/setup/backend.md.
- Run `/design-sync` (TextField, Notice, PasswordField, --warn token, HistoryEntry), then write HEAD to .design-sync/last-sync.
- User decisions: (a) all-unknown reviewed day lifts negative rating while a skipped day can't (pre-existing, §6.5; v2 ruleset?);
  (b) leftover local data of account A silently uploads into empty account B — add confirm?
- Lint: 1 known warning (only-export-components, AuthProvider.tsx useAuth).
