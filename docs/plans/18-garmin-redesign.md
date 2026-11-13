# 18 — Garmin redesign (Home «Тело», day page with week, review hints, slim Profile)

Status: approved 2026-11-13 (see «User decisions» below; nothing is blocked)
Design input: Claude Design mockups https://claude.ai/artifact/2uADR7tAWrBjXr4MsEsrLa (Main / Day / Review / Profile) and design system
https://claude.ai/artifact/DACA3akvtL8HWHLhCfzBW6. Local copies (session scratchpad, may be gone): `mockups/project/{Main,Day,Review,Profile}.dc.html`,
`ds/project/`. Mockups are the source of truth for structure, hierarchy, copy and tokens; pixels are not 1:1.

## Why
Garmin data is buried in Profile (Profile → modal → day page), ~60 equal-weight «name — value» rows, no norm/goal/average, no link
to habits, a half-finished today («40 steps») looks like a failure, and five visible bugs (below). Goal: data lives on Home as
«Тело» tiles, the day page opens with a week strip and expanded sections with context (goal / norm / status in words), the day
review shows what Garmin suggests and why, Profile only manages the connection. Garmin still only prefills (AGENTS.md); the
rating engine is not touched.

## Сводка для пользователя (русский)

**Что нашёл в коде (важно, меняет объём работ):**
- Связь привычек с Garmin **уже есть**: `Habit.source = { kind:'garmin', metric: 'steps'|'bedtime'|'wake'|'activity', activityTypes? }`
  (`src/domain/types.ts`), редактор в `HabitSheet.tsx` («Источник»), логика `src/domain/garminPrefill.ts`, предзаполнение работает в
  модалке `YesterdayReview.tsx` (подпись «из Garmin»). Не хватает: предзаполнения во вкладке «Обзор дня» (`Review.tsx`, это и есть макет),
  и подсказки «на чём основано» («Garmin: 11 711 шагов»). Порог берётся из правила самой привычки (`settingsOn(habit, day).rule`), а не
  из новой пары `op/value`. Поэтому **новая модель данных для привязки не нужна** (вариант А). Если вы хотите именно бинарный вид
  «Сделал/Не сделал» для шагов — это вариант Б, он требует новой модели (см. «Нужно ваше ок»).
- Привычки синхронизируются как JSON в `records.data` (jsonb), миграция БД для поля `source` не нужна и сейчас тоже не нужна.
- Все значения макетов уже лежат в сохранённых данных Garmin (таблица ниже), нового запроса к Garmin и миграции для плиток/страницы **не нужно**.

**Файлы, которые меняются (по шагам, подробности в Steps):**
`src/ui/Home.tsx`, `src/ui/GarminDayPage.tsx(.css/.test)`, `src/ui/Profile.tsx` (+css/test), `src/ui/Account.tsx`, `src/ui/Review.tsx`,
`src/ui/YesterdayReview.tsx`, `src/App.tsx`, `src/ui/route.ts`, `src/garmin/detailView.ts`, `src/garmin/ui.ts`, `src/domain/garminPrefill.ts`,
`src/ui/garmin/LineSeriesChart.*`, `src/ui/labels.ts`, `src/i18n/{ru,en,uk}.ts`, `src/ui/components/index.ts`, `.design-sync/config.json`.
Новые файлы: `src/ui/format.ts`, `src/garmin/dayDigest.ts`, `src/garmin/weekView.ts`, `src/ui/BodyTiles.tsx`, `src/ui/garmin/useGarminWeek.ts`,
шесть компонентов в `src/ui/components/` (ниже) с превью в `.design-sync/previews/`.
Удаляются: `src/ui/GarminDataSheet.tsx(+test)`, `src/ui/garmin/StackedBar.*` (заменён `SegmentBar`), `garminDaysView` из `src/garmin/ui.ts`, мёртвые i18n-ключи.

**Новые компоненты** (`src/ui/components/`, свой CSS, экспорт из `index.ts`, превью, `dtsPropsFor`, `[design-sync]`):
`MetricTile`, `WeekChart`, `SegmentBar` + `LegendRow`, `RangeScale`, `ProgressBar`, `FactGrid`. Переиспользуем `Card`, `Pill`, `Button`,
`SegmentedControl`, `Banner`, `Skeleton`, `TabBar`.

**Таблица «поле → источник»** (Dexie: `db.garmin[day]` = `GarminDay`, `db.garminDetail[day]` = `GarminDetail`; пути внутри — поля Garmin как есть):

| Значение на макете | Источник |
|---|---|
| «Garmin · 13:57» (Главная), «синхронизировано в 13:57» (страница дня, Профиль) | `GarminStatus.lastPullAt` из `garmin-connect GET` (`status()` в `src/garmin/api.ts`, нужна сеть) или `PullResult.lastPullAt` после `pull()`. В Dexie НЕ хранится. Время выгрузки часов `PullResult.deviceLastSyncAt` тоже не хранится. См. вопрос 3 |
| «день идёт» | вычисляется: `day === toDayKey(now)` |
| Сон: длительность 8 ч 16 мин | `garminDetail.sleep.sleepTimeSeconds` (нет в `GarminDay`; без detail — `sleepEnd − sleepStart`) |
| Сон: «00:30 → 08:48» | `garmin.sleepStart` / `garmin.sleepEnd` (ночь датируется днём пробуждения) |
| Сон: оценка 93 «Отлично» | `sleep.sleepScores.overall.{value, qualifierKey}` (EXCELLENT/GOOD/FAIR/POOR) |
| Сон: «потребность 8 ч» | `sleep.sleepNeed.actual` (минуты; есть также `baseline`) |
| Сон: фазы + легенда + % | `sleep.{deepSleepSeconds, lightSleepSeconds, remSleepSeconds, awakeSleepSeconds}`, % считаем от суммы |
| Сон: чипы качества | `sleep.sleepScores.{totalDuration, awakeCount, restlessness, stress}.qualifierKey` |
| Сон: пульс/дыхание/SpO2/стресс во сне | `sleep.{avgHeartRate, averageRespirationValue, averageSpO2Value, lowestSpO2Value, avgSleepStress}` |
| Шаги, «из 11 400», прогресс | `garmin.steps` (или `summary.movement.steps.value`), цель `summary.movement.steps.goal` (цель меняется по дням: берём цель того же дня) |
| Неделя: шаги по дням | `db.garmin[пн..вс].steps`; пунктир = цель дня из `garminDetail[день].summary.movement.steps.goal` (нет — последняя известная) |
| Неделя: полоса сна | `db.garmin[пн..вс].sleepStart/sleepEnd` на оси 22:00–10:00 (время <10:00 = «после полуночи») |
| Body Battery «сейчас 98 / 100» | `summary.bodyBattery.latestValue` (100 — константа шкалы) |
| Body Battery «за ночь +62» / «за день −4» | `summary.bodyBattery.chargedValue` / `drainedValue` (знак минус рисуем сами) |
| График Body Battery за день | `bodyBattery.bodyBatteryValuesArray` (пары `[время, значение]`) |
| Пульс покоя 46; за 7 дней; мин/макс | `heartRate.restingHeartRate` (фолбэк `summary.heartRate.restingValue`), `lastSevenDaysAvgRestingHeartRate`, `minHeartRate`, `maxHeartRate` |
| HRV 55 мс, статус, «норма 56–64» | `hrv.hrvSummary.{lastNightAvg, status (BALANCED/UNBALANCED/LOW/POOR), baseline.balancedLow, baseline.balancedUpper}` |
| HRV: концы шкалы 34 / 82 | min/max из `hrv.hrvReadings[].hrvValue` (расчёт); «среднее за неделю» `hrvSummary.weeklyAvg`; «пик 5 мин» `lastNight5MinHigh` |
| Интенсивные минуты «0 из 150 за неделю» | цель `summary.intensityMinutes.goal` (150 — недельная); значение за неделю = Σ(`moderate` + 2·`vigorous`) по дням Пн..сегодня из `garminDetail` (расчёт, формула Garmin; нужны 7 дней, см. вопрос 4) |
| Дистанция, этажи, калории всего/активные | `summary.movement.steps.distanceInMeters`, `floorsAscended/Descended.value`, `summary.calories.{burnedTotal, burnedActive}` |
| Тренировки «Силовая · 69 мин» | `garmin.activities[] = {type, minutes}` / `detail.activities[].{activityType.typeKey, duration}` |
| Стресс: средний/макс, «96% в покое» | `summary.stress.{avgLevel, maxLevel}`; % = `restDurationInMillis` / сумма всех `*DurationInMillis` |
| Стресс: полоса уровней | `summary.stress.{rest, activity, low, medium, high, uncategorized}DurationInMillis` |
| Дыхание, диапазон | `summary.respiration.{avgValue, minValue, maxValue}` |
| SpO2 среднее/мин/последнее/7 дней | `spo2.{averageSpO2, lowestSpO2, latestSpO2, lastSevenDaysAvgSpO2}` (фолбэк `summary.pulseOx`) |
| Обзор: «Garmin: 11 711 шагов» | `garmin[день].steps` |
| Обзор: «уснул в 23:03» | `garmin[день+1].sleepStart` (ночь X→X+1 датирована X+1) |
| Обзор: «силовая · 69 мин» | `garmin[день].activities` с типом из `habit.source.activityTypes` |
| Профиль: «Ключ действует до …», «Подключено» | `GarminStatus.keyExpiresAt`, `kind: 'connected'` (`status()`) |

Явно **недоступного нет**. Ограничения: время синхронизации не в Dexie; недельные интенсивные минуты — расчёт; HRV-норма
(`baseline`) бывает пустой у старых дней — тогда шкала без коридора.

**Ответы на конкретные вопросы:**
- ≥7 дней для недельного графика? **Не гарантировано.** Хранилище (`garmin`, `garmin_detail`) копит каждый дни, который хоть раз
  запрашивали, и не чистится; но автопулл (`useGarminAutoPull`) берёт только «вчера–сегодня», кнопка «Синхронизировать» — 7 дней
  (`to−6..to`). Сервер принимает диапазон ≤ 7 дней (`span ≤ 7`, `garmin-pull`). Решение без схемы: при открытии страницы дня подтягиваем
  Пн..Вс недели выбранного дня (≤ 7 дней, троттлинг 15 мин на диапазон) — шаг 13. Старые недели, которых не было в приложении, придут при первом открытии.
- HRV baseline (коридор нормы): **есть** — `hrvSummary.baseline.{lowUpper, balancedLow, balancedUpper}`.
- Потребность во сне: **есть** — `sleep.sleepNeed.{baseline, actual}` (минуты).
- Квалификаторы оценок сна: **есть** — `sleepScores.overall.qualifierKey` и по 7 подпоказателям.
- Цель по шагам: **есть** — `summary.movement.steps.goal` (и `stepGoal` в steps-diaries).
- Недельная цель интенсивных минут: **есть** `intensityMinutes.goal` (150), но значение за неделю считаем сами из 7 дней.
- Body Battery «заряжено/потрачено»: **есть** — `summary.bodyBattery.chargedValue/drainedValue` (62/4 на фикстуре 13.11).
- Список тренировок с типом и длительностью: **есть** — `GarminDay.activities` и `detail.activities`.
- Время последней синхронизации: только с сервера (`lastPullAt`), локально не хранится. Минимум: `status()` при открытии Главной/страницы дня
  (нужна сеть, офлайн — время скрыто). Постоянный локальный кэш времени = хранилище → **нужно ваше ок** (localStorage, не синхронизируется).

**Нужно ваше ок (NEEDS USER APPROVAL), ничего из этого не сделано без него:**
1. Привязка привычка ↔ Garmin: **вариант А (рекомендую, без изменений модели):** оставляем `Habit.source`, добавляем подсказки с доказательством и предзаполнение в `Review.tsx`.
   Измеримые привычки (шаги, время отхода ко сну) получают значение в поле ввода (как сейчас в модалке), а не бинарный «Сделал». **Вариант Б (ваше предложение):**
   `source.garmin = { metric: 'steps'|'sleepStart'|'sleepDuration'|'workout', op: 'gte'|'lte', value: number|string, workoutType?: string }` для
   бинарных привычек. Это изменение типа `HabitSource` (JSON в `records.data`, SQL-миграция не нужна, Dexie-индексы не меняются, но нужен
   `schema`-bump записи привычки и миграция старых `source` на клиенте), новый UI в `HabitSheet` и новая метрика `sleepDuration`. Движок рейтинга не затрагивается.
   Шаги 18–19 заблокированы до выбора.
2. Локальный кэш статуса Garmin (`localStorage`, на устройство, не синхронизируется): `connected`, `lastPullAt`, `keyExpiresAt` — чтобы Главная показывала
   «Garmin · 13:57» и баннер «Подключите Garmin» без сети и без мигания. По умолчанию (если не одобрите) — без кэша: `status()` при монтировании, офлайн время скрыто.
3. Любые новые метрики привязки (например `sleepDuration`) — это расширение `GarminMetric`/`HabitSource`, тоже схема.
Остальное (`GarminDetail`, Dexie v6, таблицы, RPC) **не меняется**.

**User decisions (2026-11-13) — these override the open questions below:**
- Binding: **variant A** — keep `Habit.source`, no model/schema change, no new metrics (`sleepDuration` not added). Steps 18–19 unblocked.
- Local Garmin status cache in `localStorage` (per device, not synced): **approved** (`connected`, `lastPullAt`, `deviceLastSyncAt` if known, `keyExpiresAt`); refreshed from `status()` when online. Wipe it on sign-out / «Удалить все данные».
- Sleep tile when last night is not uploaded yet: **«—»**.
- «Все поля»: **only `import.meta.env.DEV`**.
- Questions 2, 3, 4, 6, 8, 9: the plan's defaults are accepted.

## Acceptance criteria
- WHEN Home is shown and Garmin is connected THE app SHALL show «Тело»: 2×2 tiles Сон / Шаги / Восстановление / Тренировки и стресс after the rating header and before «Динамика»,
  with «Garmin · HH:MM» (muted, xs) next to the h2 when the last sync time is known.
- THE tiles SHALL show sleep for last night (the row of today, night ends today) and everything else for today, with «день идёт» on incomplete steps; missing metric → «—», layout intact.
- WHEN a tile is tapped THE app SHALL open `/garmin/<today>` (one tap, no modal) and scroll to its section (`#sleep`, `#activity`, `#recovery`, `#stress`).
- WHEN Garmin is not connected (known from status or no rows) THE Home SHALL show one Banner «Подключите Garmin» → Profile instead of tiles.
- THE day page SHALL show: «‹ Главная» (or «‹ Назад» when opened from review), h1 «пт, 13 ноября», muted «Garmin · синхронизировано в 13:57[ · день идёт]»; a week card (Mon–Sun of the shown day):
  steps bars + dashed goal line with label, sleep strips on a 22:00–10:00 axis with 22:00/00:00/06:00/10:00 labels, day row under the charts; selected day --accent, others --muted with opacity, future days dimmed and inert; tapping a day switches the page to that day.
- THE page SHALL show sections Сон (#sleep), Восстановление (#recovery), Активность (#activity), Стресс (#stress), Дыхание и SpO2, all expanded, each key metric with context (goal, norm or a status in words, not colour only).
- Dates SHALL read «пт, 13 ноября» (lower-case month, no CSS capitalize); durations «8 ч 16 мин»; numbers with a non-breaking group separator («11 711»); signed numbers with U+2212 («−4»).
- THE five bugs below SHALL be fixed (each with a regression test).
- WHEN the review day has habits with `source.kind === 'garmin'` and Garmin has data THE app SHALL pre-select the answer, show «Garmin: <evidence>» under the habit name, show the banner «N ответов предложены по данным Garmin…» and a link «Данные Garmin за этот день ›»; THE app SHALL never confirm the day by itself and SHALL NOT touch `src/engine/`.
- THE Profile Garmin block SHALL show only status, sync (round 44 px button, aria-label «Синхронизировать сейчас»), key expiry, «Отключить Garmin» (quiet, neg); no data modal; no sync status in «Аккаунт».
- «Все поля» SHALL not be in the main UI (dev flag only).
- Both themes, 390 px, `npm test`, `npm run lint`, `npm run build` pass; no hard-coded colours; a11y: tiles and week days are real `button`/`a` ≥44 px, charts `aria-hidden` with text values next to them, contrast ≥4.5:1.
- Edge cases: not connected; never synced; no data for the day; partial metrics; day in progress; sync older than a day → «синхронизировано вчера в …»; no HRV norm → scale without corridor.

## Bugs (where each lives)
1. «Все поля»: long key breaks into one letter per line — `src/ui/GarminDayPage.css:17-40` (`.garmin-page-tree-row` grid `minmax(0,1fr) minmax(0,auto)` with `overflow-wrap:anywhere` on both `dt` (monospace) and `dd`; rows built in `GarminDayPage.tsx:153-158`). Fix in step 1 even though the tree moves behind a dev flag (step 12).
2. Y-axis labels outside the card on the left — `src/ui/garmin/LineSeriesChart.tsx:7,111-116` (`PAD_L = 34` fixed, labels `textAnchor="end"` at `PAD_L-4` and `formatValue` includes the unit, e.g. «98 уд/мин» is wider than 30 px; `GarminDayPage.tsx:101` passes `formatValue` with unit). Same risk in `src/ui/garmin/MiniBars.tsx:43`. Fix in step 10 (axis labels without unit, padding from label width, labels start at x ≥ 0).
3. «Сон» duplicated inside Body Battery — `src/garmin/detailView.ts:268-286` builds a group per body-battery event; `eventType: 'SLEEP'` gets the title `garmin.day.bbEvent.SLEEP` = «Сон» (i18n `ru.ts:693`) next to the real Sleep section. Fix in step 9 (drop SLEEP events; keep only charged/drained and non-sleep events, or none).
4. Months capitalised («13 Ноября») — `src/ui/GarminDayPage.css:12` (`.garmin-page-title { text-transform: capitalize }`) and `src/ui/Profile.css:135` (`.garmin-day-date`); the title also uses `weekday:'long'` (`GarminDayPage.tsx:47`) instead of the short `formatDay` in `src/ui/labels.ts:64`. Fix in step 1 (+ page title in step 11).
5. Sync status shown twice — `src/ui/Account.tsx:104-119` («Синхронизация» row + `↻`) and `src/ui/Profile.tsx:388-390,404` (`garmin.lastSync`), plus the header of `GarminDataSheet.tsx:43-47`. Fix in steps 16–17 (see question 2 about the app-sync indicator).

## Open questions
None — all answered 2026-11-13 (see «User decisions» above). Original questions kept for context:

<details>

(RU, for the user; defaults are used if you do not answer, except items 1–2 which block steps.)
1. Привязка привычек: вариант А (без изменения модели; рекомендую) или Б (ваша `op/value` модель)? Блокирует шаги 18–19. Нужно ли в варианте А расширять метрики (`sleepDuration`, «любая тренировка»)?
2. «Аккаунт»: убрать строку статуса синхронизации приложения (с кнопкой ↻), как на макете? По умолчанию убираем строку, а ошибку синхронизации показываем `Notice` только когда она есть, кнопка повторной синхронизации остаётся там же только в состоянии ошибки.
3. Какое время показывать: `lastPullAt` (когда приложение забрало данные) или `deviceLastSyncAt` (когда часы выгрузили в Garmin Connect; честнее для «данные по 13:57»)? По умолчанию `deviceLastSyncAt`, если есть, иначе `lastPullAt`. Нужен ли локальный кэш (см. «Нужно ваше ок», п. 2)?
4. Недельные интенсивные минуты: считать Σ(умеренные + 2·интенсивные) по Пн..сегодня (формула Garmin, расчёт на нашей стороне) или показывать только дневные значения без «из 150 за неделю»? По умолчанию считаем, при неполной неделе подпись «по данным приложения».
5. Плитка «Сон», пока часы ещё не выгрузили сегодняшнюю ночь: «—» (по умолчанию) или вчерашняя ночь с пометкой?
6. Страница дня живёт под вкладкой «Главная» (путь `/garmin/:day` остаётся, TabBar подсвечивает Главную); из «Обзора дня» кнопка назад подписана «Назад». Ок?
7. «Все поля» только при `import.meta.env.DEV` (в сборке без флага недоступны). Ок или нужен query-флаг для отладки на телефоне?
8. Макет «Обзор дня» — список привычек (это `Review.tsx`), а обязательная утренняя модалка — карточки со свайпом. План: в `Review.tsx` — макет целиком; в модалке — только строка-подсказка с доказательством (предвыбора в свайп-карточке нет). Ок?
9. Мои решения без вашего ввода (см. Decisions): цвета уровней стресса «высокий → --neg», «активность → --pos», «низкий → --tier-strong», «средний → --warn», «покой → --tier-weak», «не определено → --muted»; иконки плиток — inline-SVG; подпись «без привязки» не показываем (по ТЗ).
Scoring coefficients are out of scope (nothing here changes Elo).

</details>

## Decisions (defaults, no user input needed)
- **Rating untouched:** no edits in `src/engine/`; prefill is initial value only; `confirmDay` is called only from the user's tap.
- **Storage unchanged** for tiles/page/week/Profile/review (variant A). Detail rows stay pull-only (record schema 5, Dexie v6).
- **Formatting module:** new `src/ui/format.ts` (locale-aware, pure, tested): `formatDayShort` (reuses `labels.formatDay` semantics, lower-case), `formatWeekRange` («9–15 ноября»),
  `formatDurationSec`, `formatNumber` (NBSP group separator for ru/uk), `formatClock`, `formatSyncTime(iso, now, t, locale)` («13:57» / «вчера в 13:57» when >24 h), minus via the existing `labels.formatSigned`.
  `detailView.formatDuration/formatDistance` re-export from it (existing tests keep passing); `labels.formatDuration(t, minutes)` stays for habit charts.
- **View-model, not UI math:** `src/garmin/dayDigest.ts` (pure) → `GarminDayDigest` for tiles and sections (sleep, steps, recovery, stress, workouts, `partial`, tones `pos|neg|plain`); `src/garmin/weekView.ts` (pure) → `WeekView` (days Mon–Sun, steps, goal, sleep strip fractions, intensity week sum).
  `detailView.ts` keeps the «Все поля» tree + units for the dev view.
- **Tones in words, not colour only:** sleep qualifier text (Отлично/Хорошо/Средне/Плохо), HRV «в норме / ниже нормы / выше нормы» (value vs `baseline`; no baseline → status text from `hrvSummary.status` or nothing).
- **Route:** `Route = { tab:'home', garminDay?, section? }` and the old `{tab:'profile', garminDay}` removed; `parseRoute('/garmin/:day')` → home tab; section is the URL hash (`#sleep`) so reload keeps the scroll target.
- **Data fetching for the page:** `useGarminWeek(day)` (live Dexie read of 7 rows + 7 detail rows) + one throttled `pull(weekStart, min(weekEnd, today))` on mount; Home keeps the existing `useGarminAutoPull` (yesterday..today).
- **Tiles:** `MetricTile` is a Card-styled `<a href>`/`<button>` (not a `Card` with onClick, which is a div); icons are inline SVG passed as a prop (`src/ui/garmin/icons.tsx`).
- **Version:** `0.18.0` (`chore: version 0.18.0`) in the last step.

## Steps
Order matters. Every step: `npm test`, `npm run lint`, `npm run build` (types) pass before the commit; ru is the i18n key source (add en/uk in the same step). Steps changing `src/ui/components/**`, tokens or global CSS carry `[design-sync]`.

### Phase 1 — formatters and bugs 1, 4
- [x] 1. Formatters + bug 1 + bug 4 (CSS part) — files: `src/ui/format.ts`, `src/ui/format.test.ts`, `src/garmin/detailView.ts` (re-export `formatDuration`/`formatDistance` from format), `src/ui/GarminDayPage.css` (tree row: `dt` above `dd`, `overflow-wrap:break-word; word-break:normal; min-width:0`, `<wbr>` after dots in the key; remove `text-transform: capitalize` line 12), `src/ui/Profile.css:135` (remove capitalize) — verify: `format.test.ts` covers ru/en/uk («пт, 13 ноября», «8 ч 16 мин», `11 711` with U+00A0, «−4» U+2212, 0 min, 59 min, ≥24 h, stale sync «вчера в 13:57»); extend `GarminDayPage.test.tsx` with a 60-char key (renders `<wbr>`, no `word-break:break-all`/`anywhere` on `dt`; add a CSS-string assertion).
  - Note: `formatSyncTime(iso, now, t)` has no `locale` arg (not needed); added i18n key `garmin.day.syncYesterday`; CSS assertion reads the file via `node:fs` (vitest strips CSS imports); existing `all-fields` assertion now expects `<wbr/>` in the key.

### Phase 2 — new components (each: tsx + css + `index.ts` export + `.design-sync/previews/<Name>.tsx` + `dtsPropsFor` + `overrides` cardMode in `.design-sync/config.json` + smoke test)
- [x] 2. [design-sync] `ProgressBar` (`value`, `max`, `tone?`, `label` (visible text beside is the caller's; bar `role="progressbar"` with `aria-valuenow/max`), height `sm|md`) and `FactGrid` (`items: {label, value, hint?}[]`, 2 columns, `--space-12/16` gaps, label muted xs, value tabular-nums md) — files: `src/ui/components/ProgressBar.{tsx,css}`, `FactGrid.{tsx,css}`, `index.ts`, `.design-sync/previews/{ProgressBar,FactGrid}.tsx`, `.design-sync/config.json`, `ProgressBar.test.tsx`/`FactGrid.test.tsx` (5 files max per commit: put both tests in `src/ui/components/garminParts.test.tsx`) — verify: `npm test`; preview renders in both themes.
- [x] 3. [design-sync] `SegmentBar` (`segments: {key,label,value,color: token name 'tier-weak'|'tier-medium'|'tier-strong'|'pos'|'neg'|'warn'|'muted'}[]`, 14 px pill bar, 2 px gaps, `aria-hidden`) and `LegendRow` (swatch, name, time text, % text; grid `12px 1fr auto 40px`); `LegendRow` is exported from the same file — files: `src/ui/components/SegmentBar.{tsx,css}`, `index.ts`, `.design-sync/previews/SegmentBar.tsx`, `.design-sync/config.json`, `SegmentBar.test.tsx` — verify: test that widths sum ≤100 %, zero segments omitted, legend text carries values.
- [x] 4. [design-sync] `RangeScale` (`min`, `max`, `value`, `corridor?: {low,high}`, `tone`, `lowLabel`, `highLabel`, `corridorLabel?`; bar 8 px `--border`, corridor `--pos` 55 % opacity, dot with `--card` ring, labels inside the box; no corridor → bar + dot only; value outside range is clamped) — files: `src/ui/components/RangeScale.{tsx,css}`, `index.ts`, `.design-sync/previews/RangeScale.tsx`, `.design-sync/config.json`, `RangeScale.test.tsx` — verify: test clamping, no-corridor, `aria-hidden` SVG.
- [x] 5. [design-sync] `MetricTile` (`href` or `onClick`, `icon`, `title`, `value` (node, big 1.5rem/700/tabular-nums), `unit?` (muted sm), `sub?` (muted xs), `footer?` (node pinned to bottom), `min-height 150px`, min tap 44 px, focus ring; renders `<a>` when `href`, else `<button>`; skeleton state via existing `Skeleton`) — files: `src/ui/components/MetricTile.{tsx,css}`, `index.ts`, `.design-sync/previews/MetricTile.tsx`, `.design-sync/config.json`, `MetricTile.test.tsx` — verify: test both element types, `—` value, long value does not overflow (`min-width:0`, `overflow-wrap:anywhere`).
- [x] 6. [design-sync] `WeekChart` (`days: {key, weekdayLabel, dayNum, steps?, goal?, sleep?: {startFrac,endFrac}, state: 'selected'|'past'|'future'|'today'}[]`, `stepsGoal`, `onSelect(key)`; SVG steps bars + dashed goal line with label, sleep strips with axis labels 22:00/00:00/06:00/10:00 drawn inside the viewBox (right gutter), day row of real `<button>`s ≥44 px, selected = `--accent`, others `--muted` with opacity, future disabled/dimmed; SVG `aria-hidden`, each day button `aria-label` carries the values in words) — files: `src/ui/components/WeekChart.{tsx,css}`, `index.ts`, `.design-sync/previews/WeekChart.tsx`, `.design-sync/config.json`, `WeekChart.test.tsx` — verify: test selected styling class, future buttons disabled, labels/text x within viewBox (parse rendered `<text x>` ≥0 and ≤ width), `onSelect` wiring via exported handler.
  - Note: pure helpers in `weekChartMath.ts`; extra props `goalLabel`, `stepsCaption`, `sleepCaption` and per-day `ariaLabel`/`stepsText` (caller strings); day row width = `PLOT_PCT` of the container so buttons align with bar columns; selected day gets `aria-current="true"`, today `aria-current="date"`.
- [x] 7. [design-sync] Docs/sync bookkeeping — files: `AGENTS.md` (Gotchas list of mirrored components: add MetricTile, WeekChart, SegmentBar, LegendRow, RangeScale, ProgressBar, FactGrid; keep ≤10 lines), `.design-sync/conventions.md` (one line per new component + the token mapping for SegmentBar colours), `.design-sync/NOTES.md` (new components, preview notes, `dtsPropsFor` list) — verify: `git diff` shows `dtsPropsFor` has an entry for each new component; the user later runs `/design-sync` (not run by agents).

### Phase 3 — day page: data, sections, week
- [x] 8. View-models — files: `src/garmin/dayDigest.ts`, `src/garmin/dayDigest.test.ts`, `src/garmin/weekView.ts`, `src/garmin/weekView.test.ts`, `src/garmin/fixtures/` (reuse `detail-*.json`; add a partial-day fixture if needed) — verify: tests on fixtures 12.11 and 13.11 (today: steps 40/11 400 → `partial`; sleep 8 h 16 min, score 93; BB 98, charged 62, drained 4; HRV 55 vs 56–64 → «ниже нормы»; stress rest 96 %), summary-only row, empty detail, missing baseline, week with gaps and future days, intensity week sum `moderate + 2·vigorous`, sleep strip fractions across midnight (`23:03 → 07:30`).
  - Note: only a 12.11 fixture exists, so the 13.11 values (steps 40/11 400, BB 98/62/4, HRV 55 vs 56–64, stress rest 96 %) are a synthetic inline detail in `dayDigest.test.ts`; no new fixture files. Modules return raw numbers/minutes/tones (no src/ui imports); `WeekViewDay` fields map onto `WeekChartDay` (UI adds labels).
- [x] 9. Bug 3 + i18n — files: `src/garmin/detailView.ts` (skip `eventType === 'SLEEP'` groups in `bodyBatterySection`; keep the rest), `src/garmin/detailView.test.ts`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts` (keys for: Body tiles, week card, section subtitles, statuses «ниже нормы/в норме/выше нормы», «день идёт», «Не в балансе/В балансе», sleep stage names reuse, `garmin.day.sync*`, `garmin.connectBanner*`, review hint/banner plurals; `Key` types update) — verify: test no body-battery group titled sleep; ru/en/uk key parity test already in the repo passes.
- [x] 10. Charts fix (bug 2) and migration of the stacked bar — files: `src/ui/garmin/LineSeriesChart.tsx` (axis labels use a unitless `formatAxis`, `PAD_L` derived from the longest label, labels never at x<0, `text-anchor` start inside the plot when too narrow), `src/ui/garmin/MiniBars.tsx`, `src/ui/garmin/LineSeriesChart.test.tsx`, `src/ui/garmin/MiniBars.test.tsx`, delete `src/ui/garmin/StackedBar.{tsx,css,test.tsx}` (usages move to `SegmentBar` in step 12; delete in step 12 if still referenced) — verify: test: for values like `9 999 уд/мин` every rendered `<text>` has `x - estimatedWidth ≥ 0` within the viewBox; lines use `--accent`, grid `--border`.
  - Note: axis labels now sit inside the plot (start-anchored, unitless via `formatAxis`) instead of a derived PAD_L; StackedBar left for step 12 (still used by GarminDayPage).
- [x] 11. Route + page shell — files: `src/ui/route.ts` (`Route` home variant with `garminDay?`, `section?`; hash handling in `routePath/parseRoute`), `src/ui/route.test.ts`, `src/App.tsx` (render `GarminDayPage` under `tab === 'home'`, back-origin ref for «Главная»/«Назад»), `src/ui/GarminDayPage.tsx` (header: «‹ Главная», h1 via `formatDayShort`, caption «Garmin · синхронизировано в HH:MM[ · день идёт]» from `useGarminSync` (approved localStorage cache `src/garmin/statusCache.ts` + test: read cache first, refresh from `status()` when online, clear on sign-out/wipe), fallback hidden), `src/ui/GarminDayPage.test.tsx` — verify: route round-trips (`/garmin/2026-11-13#sleep`), old profile path parses to home variant, smoke test of the header incl. stale sync «вчера в …» and unknown sync.
  Note: `useGarminSync` (src/garmin/useGarminSync.ts) shows deviceLastSyncAt ?? lastPullAt; cache cleared in `clearLocalData` (outbox.ts) and `wipeAccountData`. `status()` has no deviceLastSyncAt, so it is only kept if already cached (nothing writes it yet). Old `/garmin/:day` now parses to the home variant; Profile opens the page via home. «Назад» variant is a `backLabel` prop (review wiring comes later).
- [x] 12. Sections — files: `src/ui/GarminDayPage.tsx`, `src/ui/GarminDayPage.css`, `src/ui/garmin/icons.tsx` (if shared), `src/ui/GarminDayPage.test.tsx`, `src/garmin/dayDigest.ts` (only if a gap shows) — Sleep `#sleep` (big duration + score with word status, «00:30 → 08:48 · потребность 8 ч», `SegmentBar`+`LegendRow` phases with `--tier-weak/medium/strong/--muted`, quality chips (`Pill`-style or plain chips), `FactGrid`), Recovery `#recovery` (BB now + curve via `LineSeriesChart`, «за ночь +62» pos / «за день −4» neg, HRV with `RangeScale` and «норма 56–64», `FactGrid` of heart rate), Activity `#activity` (steps + `ProgressBar`, intensity week + `ProgressBar`, `FactGrid`, workouts list «Тип · N мин» or «пока нет»), Stress `#stress` (avg/max in header, `SegmentBar`+legend), Respiration/SpO2 as `FactGrid`; «Все поля» only `import.meta.env.DEV`; remove `StackedBar` usage and delete its files if step 10 left them — verify: smoke tests: full detail, summary-only, empty, partial day («день идёт»), no HRV baseline (no corridor), in-progress today; every section has its `id`.
  Note: section ids are `sleep|recovery|activity|stress` (+`breath`), the scroll effect now targets `document.getElementById(section)`; `weekIntensity` prop is optional until step 13 supplies the week sum (without it the row shows the day's minutes with «цель N»); `StackedBar` deleted; ru unit `дых/мин` -> `вд/мин`; new key `garmin.day.empty`; no new files beyond the list.
- [x] 13. Week with day switching — files: `src/ui/garmin/useGarminWeek.ts`, `src/ui/garmin/useGarminWeek.test.ts`, `src/ui/GarminDayPage.tsx`, `src/ui/GarminDayPage.test.tsx`, `src/ui/GarminDayPage.css` — `WeekChart` card on top («Неделя», «9–15 ноября»), `useGarminWeek(day)` reads 7 `garmin` + 7 `garminDetail` rows live and fires one throttled `pull(weekStart, min(weekEnd,today))` (backfill; `PullResult` ignored on error), tapping a day calls `navigate({tab:'home', garminDay: key}, {replace:true})` (week stays, page switches); future days inert — verify: test: week boundaries (Mon start, month/year rollover), backfill range ≤ 7 days span, selection switches, partial week data renders with gaps, smoke render with seeded 7 days.
  - Note: files are `src/ui/garmin/useGarminWeek.ts` (+test), `GarminDayPage` props `onSelectDay`/`week` (test seam), `App.tsx` wiring, 3 i18n files (aria/goal-suffix keys). Throttling lives in `api.pull` (per range = per week, 15 min); `PullResult.deviceLastSyncAt` exists and is written to the status cache. Day switch remounts the page (App `key`), which scrolls to top.

### Phase 4 — Home «Тело» and anchors
- [x] 14. Anchors — files: `src/ui/garmin/useScrollToSection.ts`, `src/ui/garmin/useScrollToSection.test.ts`, `src/ui/GarminDayPage.tsx`, `src/ui/route.ts` (if not complete from step 11), `src/ui/route.test.ts` — `#sleep|#recovery|#activity|#stress` scrolls the section into view once the data has rendered (and again on `hashchange`), offsets for the sticky nothing (TabBar is bottom) — verify: unit test of the pure `sectionIdFromHash` + a test that unknown hash is ignored; manual: reload at `/garmin/<day>#stress`.
  - Note: `useScrollToSection(section, ready)` also listens to `hashchange` (known ids incl. `breath`); route.ts/route.test.ts already complete from step 11, unchanged; `scrollToSection` takes an injectable finder (no DOM env in tests).
- [ ] 15. Home «Тело» — files: `src/ui/BodyTiles.tsx`, `src/ui/BodyTiles.css`, `src/ui/Home.tsx`, `src/ui/Home.test.tsx`, `src/App.tsx` (pass `today`, `onOpenGarmin(day, section)`; hook `useGarminToday`) — h2 «Тело» + muted xs «Garmin · HH:MM»; grid 2×2 `gap: var(--space-12)`; 4 `MetricTile`s from `garminDayDigest`: Сон (duration, «00:30 → 08:48», «● 93 Отлично» pos/neg), Шаги («из 11 400», `ProgressBar`, «день идёт»), Восстановление («98 / 100», «Body Battery · пульс покоя 46», «● HRV 55 ниже нормы»), Тренировки и стресс (avg stress, «96% времени в покое», «Силовая · 69 мин» / «Тренировок пока нет»); not connected → one `Banner` «Подключите Garmin» → Profile; no data → «—»; loading → `Skeleton` — verify: `renderToString` smoke tests: connected full day, partial today, empty day, not connected, loading, no sync time; tap target is `<a>`/`<button>` ≥44 px.

### Phase 5 — Profile
- [ ] 16. Garmin block + delete the modal — files: `src/ui/Profile.tsx` (GarminSection per mockup: «● Подключено», «Синхронизировано в HH:MM», round 44 px sync button `aria-label` = `garmin.syncNow`, intro «Шаги, сон и тренировки предлагают ответы в обзоре дня. Подтверждаете день вы сами.», «Ключ действует до …», `Button variant="quiet" className="neg"` «Отключить Garmin»; keep expiry-soon/expired/invalid and last-attempt-failed notices), `src/ui/Profile.css`, `src/ui/Profile.test.tsx`, delete `src/ui/GarminDataSheet.tsx` + `.test.tsx`, `src/App.tsx` (drop `onOpenGarminDay`/`garminFromApp` Profile wiring) — verify: smoke: connected, expiring, expired, error, not connected, syncing; no `GarminDataSheet`/`viewData` strings left (`grep`).
- [ ] 17. Account row + dead code sweep (bug 5) — files: `src/ui/Account.tsx` (remove the «Синхронизация» row per question 2; show a `Notice` + resync only on error), `src/ui/Account.test.tsx`, `src/garmin/ui.ts` + `src/garmin/ui.test.ts` (drop `garminDaysView`, `GarminDayView`), `src/i18n/{ru,en,uk}.ts` (remove `garmin.viewData`, `garmin.data.*`, `garmin.lastSync`/other keys that grep shows unused; `account.sync` only if unused), `src/ui/Profile.css` (`.garmin-day*`, `.garmin-data*` rules) — verify: `grep -rn "garminDaysView\|GarminDataSheet\|garmin.data\." src` empty; sync status appears once on the Profile screen.

### Phase 6 — review hints (variant A, approved)
- [ ] 18. Evidence + shared prefill hook — files: `src/domain/garminPrefill.ts` (`garminEvidence(habits, day, byDay) → Record<id, {entry, evidence: {kind:'steps'|'bedtime'|'wake'|'activity', value: number|string, minutes?: number, type?: string}}>`, built on the existing `entryFor`; pure, no engine), `src/domain/garminPrefill.test.ts`, `src/ui/garmin/useGarminPrefill.ts` (extracts the pull + `useLiveQuery` + `mergeGarminPrefill` logic now inline in `YesterdayReview.tsx:95-135`), `src/ui/YesterdayReview.tsx` (use the hook; hint line shows evidence «Garmin: 11 711 шагов», yes/no text kept), `src/ui/YesterdayReview.test.tsx`/`yesterdayParts.test.tsx` — verify: unit tests: steps/bedtime (day+1 row)/wake/activity types/missing data → no key (never «no»)/not applicable habit skipped; touched answers never overwritten (existing `mergeGarminPrefill` tests stay green); no import from `src/engine`.
- [ ] 19. `Review.tsx` hints per mockup — files: `src/ui/Review.tsx`, `src/ui/Review.css` (new, plain CSS: `.review-hint` xs muted row, accent dot, bold evidence), `src/ui/Review.test.tsx` (new `renderToString` smoke: with 3 hints + 1 unbound habit, banner text, link, none preselected for unbound), `src/i18n/{ru,en,uk}.ts` — banner above the list «N ответов предложены по данным Garmin. Проверьте их и подтвердите день.» (plural by `count`, hidden at 0), under the habit name «Garmin: <evidence>», preselected answer only as initial `entries` state (via `useGarminPrefill`; `touched` guard), «Данные Garmin за этот день ›» link at the bottom (navigates to `/garmin/<day>`), no hint for unbound habits; confirm button unchanged (`confirmDay` only on tap) — verify: smoke tests; test that `confirmDay` is not invoked on mount; locked/already confirmed day gets no prefill.

### Phase 7 — verification, screenshots, version
- [ ] 20. Screenshots + report + version — files: `docs/plans/18-screens/` (PNG: `home-{light,dark}.png`, `day-{light,dark}.png`, `review-{light,dark}.png`, `profile-{light,dark}.png`, 390 px wide via Playwright + installed Chrome from `.ds-sync/` as in `.design-sync/NOTES.md`, forcing `data-theme` on `:root`, Dexie seeded with the 12–13.11 fixtures), `package.json` (`0.18.0`), `AGENTS.md` (Layout lines: `src/garmin/dayDigest.ts`, `weekView.ts`, new components), this plan (status `done`, Report section: done / left / decisions taken by the implementer) — verify: `npm test`, `npm run lint`, `npm run build`; commit `chore: version 0.18.0`; check the acceptance list item by item against the screenshots.
