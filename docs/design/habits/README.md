# Habits — design input

Source: Claude Design project `67c2bfac-e6da-422e-98bb-a3415b430a31`, file `templates/habits/Habits.dc.html`
(exported 2026-11-08). The mockup shows the Habits list with an «Добавить» button and a bottom sheet
«Новая привычка». **User decisions below win over the mockup.**

## UI decisions (user, 2026-11-08)
1. Thresholds: keep all three threshold fields (Отлично / Норм / Терпимо) open for measured habits, styled per the
   mockup (the mockup's single «target» field is replaced by the three fields).
2. «За неделю» period exists for constructive AND destructive habits (see scoring below).
3. Quota extras (per-day limit, «weekly limit reduced by days of habit X») stay visible, shown openly under «Норма».
4. Editing uses the same sheet («Изменить привычку»): tap a habit card → sheet with Save, Pause/Resume and Delete
   (with confirmation). Direction (type) is locked when the habit already has answers, as today.
5. List: cards styled per the mockup (colored dot + meta line «Тип · Важность · норма»), but the existing grouping
   by direction and tier stays.
6. The «Больше лучше / Меньше лучше» switch is removed: `better` is derived from direction
   (constructive → higher / for time: earlier is better = «Сделать до»; destructive → lower / «Не позже»).
   Existing habits whose `better` disagrees with their direction keep their stored value unchanged.

## Scoring decisions — constructive weekly goal «N days per week» (user, 2026-11-08)
New ruleset version (v2); past days are not re-scored under v1 semantics. Applies to constructive **yes/no**
habits with period «За неделю» (stepper 1–7). Calendar week Mon–Sun.
- П1 Missed day: while the target is still reachable this week (remaining days ≥ remaining needed), a not-done
  day is *not applicable* (removed from Σ weights, streak paused). Once the target is unreachable, each further
  not-done day is *tolerable* (0).
- П2 Never *bad*: a missed weekly goal only means fewer points.
- П3 Days beyond the target (5th of 4) are still *excellent* (full points).
- П4 Streak counted in **weeks**: number of consecutive weeks with the target met; the current week counts as soon
  as the target is reached. Streak bonus is paid on each done day with the usual formula
  `20 × (weight / Σ weights) × f(weekStreak)`.
  - П4.1 f by tier: strong → full from week 1; medium → ½ in week 1, full from week 2; weak → 0 in week 1,
    full from week 2.
  - П4.2 A week that ends with the target not met halves the week streak (floor), like *tolerable*.
- П5 Weekly period only for yes/no habits. For measured habits (число/минуты/шаги/время) the period switch is
  hidden; destructive «число» keeps the per-day / per-week limit fields (decision 3).
- П6.1 An unreviewed day or per-habit *unknown* counts as «not done» for the weekly target; it does not by itself
  break the week streak (the streak only changes at week end / when the target is reached).
- П6.2 Partial week (habit created mid-week or paused part of the week): target is pro-rated,
  `ceil(N × activeDays / 7)` (e.g. 4/7 from Thursday → ceil(4×4/7) = 3).

Destructive yes/no with «За неделю» + stepper (0–6) maps onto the existing weekly quota (`quota.perWeek`, each
«yes» day counts 1) — no new scoring.
