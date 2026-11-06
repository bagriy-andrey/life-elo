# Handoff
Updated: 2026-11-06 by Claude Code
Branch: auth-sync (not pushed, no PR yet)
Plan: docs/plans/04-auth-sync.md, 15 of 15 built + verified; Status: done, manual E2E pending
## In progress
Nothing.
## Next step
User: create Supabase project etc. per docs/setup/backend.md, `npx supabase db push --remote`, deploy to Vercel,
run the §8 checklist (incl. iPhone PWA + Google), record results in plan step 15; then `/design-sync`
(TextField, Notice, PasswordField, --warn, HistoryEntry) and write HEAD to .design-sync/last-sync; open PR.
## Broken / open questions
- Not verified live yet: password reset email, sync between two devices, Google in iOS PWA (login/register/Google/linking OK on localhost 2026-11-06).
- User decisions: (a) all-unknown reviewed day lifts a negative rating, a skipped day can't (pre-existing, §6.5; v2?);
  (b) leftover data of account A uploads silently into empty account B — add confirm?;
  (c) «Не помню текущий пароль» shows a hint instead of sign-out → forgot with email prefilled — keep?
- Lint: 1 known warning (only-export-components on useAuth in AuthProvider.tsx).
