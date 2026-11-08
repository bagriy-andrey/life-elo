# Handoff
Updated: 2026-11-08 by Claude Code
Branch: habit-sheet (not pushed, no PR yet)
Plan: docs/plans/09-habit-sheet.md — done (10/10), verifier PASS on every step. Tests 377 / lint / build green
(1 old lint warning: src/i18n/index.tsx:40).
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual check in `npm run dev`: create constructive 4/week, destructive weekly yes/no, measured with 3 thresholds;
   edit / pause / delete via the sheet; answer yesterday for a weekly-goal habit («На этой неделе: X из N»); 375px, dark.
2. Run `/design-sync` (new: BottomSheet, Stepper, WeekDots, ChipGroup, TypeCards; SegmentedControl `bars`).
3. Push + PR, merge, deploy.
## Broken / open questions
- SegmentedControl track not restyled to the mockup's pill-in-tray look (only bars added) — ask user.
- Destructive weekly quota: after an overrun, later 0-days that week stay bad (v1 rule, deferred in product context).
- Old: password-reset email (Resend test sender); Google sign-in in iOS PWA unverified; `--warn` has no dark value.
