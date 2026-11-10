# Handoff
Updated: 2026-11-09 by Claude Code
Branch: habit-page (from main). Plan: docs/plans/12-habit-page.md — done, v0.12.6 (fix rounds: delete dialog row, «Деструктивная», heatmap without
scroll, charts per habit type, last-7-days bars — see spec «Revision 2026-11-10»). Spec: docs/specs/12-habit-page.md.
Built: habit page `/habits/:id` (stats, chart by type, 12-month heatmap, weekday bars), ⋮ `Menu` on list cards
and page, delete dialog, sheet without Пауза/Удалить + «Терпимо до» (= `rule.tolerable`; +30 min default is display-only).
Steps were built by parallel implementers in worktrees, merged here; verifier PASS on the whole plan.
## In progress
Nothing uncommitted.
## Next step (user)
1. Manual check in `npm run dev` at 375px, light/dark: list → page for daily yes/no (both directions), minutes,
   time with tolerable, weekly yes/no; ⋮ menu (flip above near the bottom), pause badge, delete from page.
2. design-sync done (2026-11-10): 27 components incl. Menu.
3. PR for `habit-page` is open: review, merge, deploy.
## Broken / open questions
- Minor (verifier): `placeMenu` export in `Menu.tsx` gives an oxlint fast-refresh warning; HabitCard is
  `role=button` with a nested ⋮ button (a11y); «Назад» pushes `/habits` instead of history.back.
- Carried over: SegmentedControl track not pill-in-tray; destructive weekly quota after overrun (v1 rule);
  email-change link opens in Safari; Resend sender limits; Google sign-in in iOS PWA unverified.
