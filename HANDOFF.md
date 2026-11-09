# Handoff
Updated: 2026-11-09 by Claude Code
Branch: habit-sheet (PR #9), main (PR #8 profile redesign) merged in.
Plans: docs/plans/09-profile-redesign.md (on main) and docs/plans/10-habit-sheet.md — both done.
Merge: the two independent `BottomSheet`s unified (habit-sheet API: closeLabel, footer; main's `sheet-option`/`sheet-check`
pick-list styles kept, now inside `<div className="sheet-options">`); the profile language sheet now has the ✕ header.
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual check in `npm run dev` at 375px, light/dark: habit sheet (constructive 4/week, destructive weekly yes/no,
   measured thresholds, edit/pause/delete), weekly-goal review, minutes habit scores «more is better»;
   profile view/edit, language sheet, export, clear-all (cancel only).
2. Paste `supabase/templates/email_change.html` into the Supabase dashboard (docs/setup/backend.md §6), test «Сменить».
3. Re-run `/design-sync` (BottomSheet changed in the merge), record HEAD in `.design-sync/last-sync`. Merge PR #9, deploy.
## Broken / open questions
- SegmentedControl track not restyled to the mockup's pill-in-tray look (only bars added) — ask user.
- Destructive weekly quota: after an overrun, later 0-days that week stay bad (v1 rule, deferred in product context).
- Email-change link opens in Safari, not the PWA; Google-only accounts can't change login email.
- Old: Resend test sender limits mail; Google sign-in in iOS PWA unverified; `--warn` has no dark value.
