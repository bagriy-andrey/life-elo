# Handoff
Updated: 2026-11-08 by Claude Code
Branch: profile-redesign (from main, not pushed)
Plan: docs/plans/09-profile-redesign.md — done (13/13), verifier PASS on every step. Tests 334 / lint / build green
(1 old lint warning: src/i18n/index.tsx:40). App version 0.9.0.
## In progress
Nothing uncommitted. `stash@{0}` "home-chart draft" is obsolete; drop it.
## Next step (user)
1. Manual check in `npm run dev` at 375px: view/edit, language sheet, theme, export (file has a `rating` block),
   clear-all dialog (cancel only), sync ↻, ru/en/uk, light/dark.
2. Paste `supabase/templates/email_change.html` into the Supabase dashboard (docs/setup/backend.md §6), then test
   «Сменить» login email on a real email/password account.
3. Run `/design-sync` (new BottomSheet), then record HEAD in `.design-sync/last-sync`.
4. Push and open a PR, then merge and deploy.
## Broken / open questions
- The email-change link uses `{{ .ConfirmationURL }}`, so it opens in Safari, not the installed PWA. The new email shows after the next session refresh.
- Google-only accounts cannot change their login email (managed by Google); they see the caption «Вход через Google».
- Known: the Resend test sender limits mail delivery; `--warn` token has no dark value.
