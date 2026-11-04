# 04 — Profile, settings, full i18n (ru / en / uk)

Status: approved
Design input: https://claude.ai/design/p/67c2bfac-e6da-422e-98bb-a3415b430a31?file=templates%2Fprofile%2FProfile.dc.html
(not readable by agents; the summary below is the contract. Roadmap item «Профиль и настройки», `docs/ROADMAP.md`.)

## Why
A 4th tab «Профиль» (after Привычки): the user's name, optional nick / email / birth date / photo, current rating,
«С нами с» date, plus settings (language, theme) and «Очистить все данные». The user decided on FULL i18n now
(ru, en, uk for every screen), so the language setting really works. Profile and settings never affect Elo.

## Decisions (binding, from the user)
- Full i18n for ALL screens, components' built-in strings, `labels.ts`, plurals, date/month formatting.
- Only the name is required. Nick, email, birth date are validated only when filled. Asterisk only on name.
- No onboarding: the app works without a profile; the Profile tab opens straight into edit mode when no profile
  exists (no «Отмена» then).
- «С нами с» = profile `createdAt`, stored on the first save and never changed afterwards.

## Implementation defaults (planner's choices)
- i18n: no library. `src/i18n/` holds `ru.ts` (source-of-truth key set, plain object of strings or plural-form
  objects), `en.ts` and `uk.ts` typed `Dict = typeof ru`-shaped so a missing key is a compile error (`tsc` in
  `npm run build`). `t(key, params?)` with `{name}` interpolation; plurals via `Intl.PluralRules(locale)` with forms
  `{ one, few?, many?, other }`. Default language `ru`. Engine and domain contain no UI strings: domain validators
  return error KEYS, the UI translates them.
- Without a provider `useI18n()` falls back to `ru`, so components render in design-sync previews unchanged.
- Settings (language, theme) live in localStorage under `life-elo:prefs` (JSON `{ lang, theme }`): they must be read
  synchronously before first paint, and are tiny. Profile (and photo) live in Dexie. No second copy of settings.
- Photo: resized client-side to max 256 px (longest side, canvas, JPEG q≈0.85) and stored as a data URL string in the
  profile row. Why not Blob: a ~20 KB string is JSON-safe, needs no object-URL lifecycle, works directly with
  `useLiveQuery`, and avoids old iOS Safari IndexedDB blob quirks.
- Profile storage: new Dexie table `profile` (primary key `id`, single row `id: 'me'`), db `version(3)`; no data
  migration needed (new store only).
- Theme: `data-theme="light|dark"` on `<html>` only for forced themes; «Системная» = no attribute.
  A tiny inline script in `index.html` applies `data-theme` and `<html lang>` from localStorage before first paint;
  `main.tsx`/provider keep them in sync afterwards. `color-scheme` follows the theme. The `theme-color` meta is
  updated at runtime only if the tag exists (the manifest keeps static colors).
- «Очистить все данные»: one Dexie `rw` transaction clearing every table (habits, events, reviews, wellbeing,
  rewards, profile), then remove `life-elo:prefs` and `location.reload()` (language/theme reset to ru/system).
- Rating card: `formatSigned(result.rating, 1)` with the same pos/neg/zero class logic as `EloScore`.
- New shared components (each its own step, with design-sync): `Field`, `Avatar`, `Dialog`; `Button` gets variants
  `danger` (filled `--neg`) and `quiet` (no border/background; «Добавить фото», «Очистить все данные» with class `neg`).

## Acceptance criteria
- WHEN the user changes the language THE app SHALL immediately show every screen, component string, habit label,
  zone/tier label, error message, plural (e.g. years of age) and date/month name in that language, persist it, and
  set `<html lang>`.
- WHEN a dictionary lacks a key present in `ru` THE build SHALL fail type-checking; a test SHALL also check that
  ru/en/uk have identical key sets and identical `{placeholders}` per key.
- WHEN no profile exists THE Profile tab SHALL open in edit mode without «Отмена»; WHEN one exists it SHALL open in
  view mode with «Изменить» / «Отмена» in the header.
- WHEN saving THE app SHALL require a trimmed name of 1–40 characters; nick (leading `@` stripped) SHALL match
  `^[A-Za-z0-9_]{3,20}$` if filled; email SHALL match `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` if filled; birth date SHALL
  not be in the future and imply age ≤120 if filled. Errors show after blur or a failed save attempt (nick errors
  while typing), with `aria-invalid`; a failed save keeps edit mode and writes nothing.
- WHEN the profile is saved the first time THE app SHALL store `createdAt`; later saves SHALL keep it.
- WHEN a valid birth date is entered THE app SHALL show the age with correct plural («1 год», «2 года», «5 лет»;
  en/uk forms likewise) under the field and in view mode as «14 мая 1996 · 30 лет».
- WHEN the user picks a photo THE app SHALL store a ≤256 px resized version and show it as the avatar; without a
  photo THE avatar SHALL show initials (first letters of up to two words, uppercased) on an accent-tinted background.
- WHEN the theme is Системная / Светлая / Тёмная THE app SHALL follow the OS / force light / force dark, with no flash
  of the wrong theme on load.
- WHEN the user confirms «Очистить все данные» THE app SHALL delete all stored data, reset preferences and show the
  empty app; WHEN they press «Отмена» or the overlay nothing changes.
- Rating SHALL NOT change from any profile/settings action; Elo, ledger and `src/engine` stay untouched.

## Open questions
(none)

## Steps
- [x] 1. i18n core — `src/i18n/types.ts` (`Lang = 'ru'|'en'|'uk'`, `Dict`, `PluralForms`), `ru.ts`, `en.ts`, `uk.ts`
  (start with tab names + common words: Главная/Обзор дня/Привычки/Профиль, Отмена, Сохранить, Удалить, month/day
  names are NOT dictionary entries — use `Intl` with locale `ru-RU|en-GB|uk-UA`), `src/i18n/index.tsx`
  (`I18nProvider`, `useI18n() → { t, plural-aware t, lang, locale, setLang }`, ru fallback without provider,
  `loadPrefs/savePrefs` for `life-elo:prefs`, sets `document.documentElement.lang`), `src/i18n/i18n.test.ts`
  (interpolation, plural per language incl. ru one/few/many, key-set and placeholder parity of the 3 dictionaries,
  prefs parse tolerates garbage), `src/main.tsx` (wrap `<App/>` in the provider). Tests may exercise pure functions
  (`translate(dict, key, params)`) instead of rendering. — verify: `npm test`, `npm run lint`, `npm run build`.
  Note: split into `types.ts`, `translate.ts`, `prefs.ts` (lang only; merges so step 7 can add theme), `index.tsx`.
- [x] 2. Translate `labels.ts` — convert all constants to dictionary keys / functions taking `t` + locale:
  `TIER_*`, `DIRECTION_*`, `ZONE_LABEL`, `UNIT_LABEL` (+ suffix), `BOOLEAN_OPTIONS`, `NOT_APPLICABLE_LABEL`,
  `RULE_CHOICE_LABEL`, `BETTER_LABEL`, `ruleSummary`, `quotaSummary`, `formatDay(day, locale)`; `formatSigned` and
  `TIER_COLOR` unchanged. Add keys to ru/en/uk; update every importer just enough to compile (pass `t`/locale; no
  other string moves yet) — files: `src/ui/labels.ts`, `src/ui/labels.test.ts` (new: formatDay per locale,
  ruleSummary/quotaSummary per language), `src/i18n/{ru,en,uk}.ts`, importers (`Home.tsx`, `Review.tsx`, `Habits.tsx`,
  `HistoryEntry.tsx`) — verify: `npm test`, `npm run build`.
  Note: labels became functions of `t` (`tierLabels(t)`, `booleanOptions(t)`, ...). New keys also `history.unknown`, `rule.zoneValue`, `quota.*`. Unit suffix en/uk not pluralized («1 times»); Review's literal 'раз' left for step 4.
- [x] 3. [design-sync] Translate Home, App shell and components with built-in strings — `Home.tsx`, `App.tsx` (tab
  labels), `components/EloScore.tsx` («Life Elo» stays; «Чистых дней подряд: N» → plural-aware key),
  `components/HistoryEntry.tsx` (all lines, zone/extra labels), ru/en/uk keys. Components call `useI18n()` (works
  without provider = ru). Note in `.design-sync/NOTES.md` that previews render in ru by default — verify:
  `npm run build`, `npm test`; manual `npm run dev` with `localStorage['life-elo:prefs']='{"lang":"en"}'`: Home and
  History expand fully in English.
  Note: also fixed step 2's unit suffix: `unit.count/steps/minutes` are plural forms, rendered with the value's count (tests ru/en/uk for 1, 2, 5, 21). Review.tsx/Habits.tsx still use own literals until steps 4/6.
- [x] 4. Translate Review — `src/ui/Review.tsx` (all strings, error messages, `aria-label`s), ru/en/uk keys — verify:
  `npm run build`; manual: review a day in en and uk, unit suffixes and buttons translated.
  Note: `unitLabels(t, count)` now takes the displayed value for plural units; Review passes the entry value (quota uses `unit.count`).
- [x] 5. Domain errors as keys — `src/domain/habitSetup.ts`: validators return `{ ok:false, error: { key, params? } }`
  instead of Russian text (keys live in the dictionaries), keep behavior identical; update `habitSetup.test.ts`
  (assert keys) and the `Habits.tsx` call sites minimally (`t(error.key, error.params)`) — files:
  `src/domain/habitSetup.ts`, `src/domain/habitSetup.test.ts`, `src/ui/Habits.tsx`, `src/i18n/{ru,en,uk}.ts` —
  verify: `npm test`, `npm run build`.
  Note: keys are `habitError.*` (typed `SetupErrorKey`, checked against `Key` by tsc at the call site); added `habitError.nameEmpty` for Habits' empty-name edit error.
- [x] 6. Translate Habits — `src/ui/Habits.tsx` (all remaining strings, delete confirmation, locked-direction note,
  placeholders), ru/en/uk keys — verify: `npm run build`, `npm run lint`; manual: create/edit/delete a habit in en/uk.
  Note: unit hints reuse plural `unit.*` keys (count 5); delete-in-use is `habitError.deleteInUse` with `{names}`, so `editError` is `SetupError` again.
- [x] 7. [design-sync] Theme tokens — `src/ui/tokens.css`: keep light defaults in `:root`; dark values in
  `:root[data-theme='dark']` and in `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`
  (identical values, comment that they must stay in sync); `color-scheme` per theme (`light dark` default,
  `light`/`dark` when forced) — move from `src/index.css`. New `src/ui/prefs.ts`: `type Theme = 'system'|'light'|'dark'`,
  `applyTheme(theme)` (sets/removes `data-theme`, updates `meta[name=theme-color]` if present). Inline script in
  `index.html` applying `data-theme` and `lang` from `life-elo:prefs` before paint (try/catch, no deps); `main.tsx`
  and the provider call `applyTheme`. `prefs` shape shared with step 1 (`{ lang, theme }`, defaults ru/system) —
  files: `src/ui/tokens.css`, `src/index.css`, `src/ui/prefs.ts`, `src/ui/prefs.test.ts` (parse/default/merge),
  `index.html`, `src/main.tsx` — verify: `npm test`; manual: set prefs theme to light/dark in devtools and reload —
  no flash, correct colors with OS in the opposite mode. `.design-sync/NOTES.md`: tokens now have forced-theme
  selectors.
  Note: Prefs/Theme/parse live in `src/i18n/prefs.ts` (step 1); tests in `src/i18n/i18n.test.ts`; `src/ui/prefs.ts` has only `applyTheme`.
- [x] 8. Pure profile logic — `src/domain/profile.ts` (+ `profile.test.ts`): `Profile` type
  `{ id:'me', name, nick?, email?, birth?: 'YYYY-MM-DD', photo?: string, createdAt: number }` (also add to
  `types.ts` if that is the convention), `normalizeNick` (strip leading `@`, trim), `validateProfile(input, today)`
  → `{ name?, nick?, email?, birth? }` error keys (`profileError.nameRequired`, `nameTooLong`, `nickInvalid`, `emailInvalid`,
  `birthInvalid`, `birthFuture`, `birthYear`), `ageOn(birth, today)` (birthday not yet reached → minus 1; Feb 29 safe),
  `initials(name)`. Dictionary keys for these errors + hint texts in ru/en/uk — files: `src/domain/profile.ts`,
  `src/domain/profile.test.ts`, `src/i18n/{ru,en,uk}.ts` — verify: `npm test` (boundaries: name 40/41 chars, nick
  2/3/20/21, email edge forms, birth today/tomorrow/121 years ago, birthday eve, initials of «  анна   мария  », one
  word, emoji/empty).
- [x] 9. Profile storage and wipe — `src/db/db.ts`: `profile: EntityTable<Profile,'id'>`, `db.version(3).stores({
  profile: 'id' })`; new `src/db/profile.ts`: `saveProfile(input, now)` (creates with `createdAt: now` or updates
  keeping existing `createdAt`; trims name, normalizes nick/email/birth, drops empty optionals), `clearAllData()`
  (single `rw` transaction over all tables; removing the prefs key is done by the caller/UI step). Pure bits
  (`buildProfile(existing, input, now)`) unit-tested — files: `src/db/db.ts`, `src/db/profile.ts`,
  `src/db/profile.test.ts` — verify: `npm test`, `npm run build`; manual: reload keeps v1→v3 upgrade working with
  existing habits/reviews intact.
- [x] 10. [design-sync] `Field` component — label (text-sm, 600) + optional `required` asterisk + wrapped control
  (children, native input) + optional `prefix` (absolute-positioned, e.g. «@») + `hint` (muted xs) + `error` (`--neg`
  xs, `role="alert"`-free, linked by `aria-describedby` via `useId`; `Field` itself sets `aria-invalid` and `id`; hint/error sit outside the `<label>`).
  Files: `components/Field.tsx`, `Field.css`, export in `components/index.ts`, `dtsPropsFor.Field` in
  `.design-sync/config.json` + a `cardMode: column` override, preview per `.design-sync/NOTES.md` — verify:
  `npm run build`, `npm run lint`; check the emitted `.d.ts`.
  Note: Field reuses the global input style (`src/index.css`), adding only min-height 44 / width 100% / prefix padding;
  it clones its single child to add `aria-describedby`.
- [x] 11. [design-sync] `Avatar` component — props `src?`, `name`, `size?` (default 96): round photo or initials
  (`initials()` from domain) on `color-mix(in srgb, var(--accent) 15%, var(--card))` with accent text, 2rem bold at
  96px (scale with size). Files: `components/Avatar.tsx`, `Avatar.css`, `index.ts`, `.design-sync/config.json`
  (dtsPropsFor + override), preview — verify: `npm run build`, `npm run lint`.
  Note: also `onClick?` + `label?` (aria-label) → renders a dashed-border button for edit mode; size via `--avatar-size`.
- [x] 12. [design-sync] `Button` variants — add `danger` (filled `--neg` bg, `--accent-text`-like readable text in
  both themes) and `quiet` (no border/background, accent text). Files: `components/Button.tsx`, `Button.css`,
  `.design-sync/config.json` (`dtsPropsFor.Button` variant union + doc comments), Button preview — verify:
  `npm run build`; visual check both themes.
- [x] 13. [design-sync] `Dialog` component (alertdialog) — props `open`, `title`, `onClose`, children (body and
  actions); overlay `rgba(0,0,0,.45)`, click on overlay closes, Escape closes, `role="alertdialog"`,
  `aria-modal`, `aria-labelledby`, focus moves into the dialog on open and returns on close; card-styled panel.
  Files: `components/Dialog.tsx`, `Dialog.css`, `index.ts`, `.design-sync/config.json`, preview — verify:
  `npm run build`, `npm run lint`; manual keyboard check (Esc, Tab stays inside is nice-to-have, not required).
- [ ] 14. Profile screen (view mode) + tab wiring — new `src/ui/Profile.tsx` + `Profile.css` (view layout only:
  avatar, name, `@nick`, 2-col cards «Рейтинг» / «С нами с» via `toLocaleDateString(locale, {day:'numeric',
  month:'long', year:'numeric'})`, rows Почта / Дата рождения with `—` fallback and age plural), `App.tsx`: `Tab`
  gets `'profile'`, 4th TabBar item «Профиль», `useLiveQuery(() => db.profile.get('me'))`, pass `result.rating`.
  Props: `profile`, `rating`, `onEdit`. When no profile exists render a temporary empty state until step 15 —
  files: `src/ui/Profile.tsx`, `src/ui/Profile.css`, `src/App.tsx`, `src/i18n/{ru,en,uk}.ts`, shared age-text helper
  with test if added — verify: `npm run build`, `npm run lint`; manual: with a profile saved via devtools/Dexie
  the view renders in 3 languages, rating matches Home. TabBar `dtsPropsFor` unchanged (items generic).
- [ ] 15. Profile edit mode — `Profile.tsx`: header «Изменить»/«Отмена»; no profile → starts in edit mode without
  «Отмена»; form with `Field`s (Имя*, Ник with «@» prefix + hint when empty, Почта type=email, Дата рождения
  type=date `max=today` + age hint), `validateProfile` wiring (touched-on-blur, attempted-save, nick live),
  `aria-invalid`, primary full-width «Сохранить» (min-height 48) → `saveProfile`, then back to view mode.
  Local state reset when switching modes; text inputs still use global input style from `src/index.css` — files:
  `src/ui/Profile.tsx`, `src/ui/Profile.css`, `src/i18n/{ru,en,uk}.ts` — verify: `npm run build`; manual: first
  save creates profile (view shows today as «С нами с»), edit keeps the date, each validation message in 3 languages,
  invalid save writes nothing.
  Note: Pass `toDayKey(new Date())` (calendar date) to validateProfile/ageOn — NOT dayOf/reviewDay (04:00 boundary would reject today's birth date 00:00–04:00).
  Note: Avatar in button mode must always get `label` (accessible name; photo img has alt="").
- [ ] 16. Photo — `src/ui/photo.ts`: pure `fitSize(w, h, max=256)` (never upscales, keeps ratio) + `resizeImage(file)
  → Promise<string>` (createImageBitmap/Image + canvas → JPEG data URL; rejects non-images and decode errors);
  `photo.test.ts` for `fitSize`. Profile edit: dashed avatar button + quiet text button «Добавить фото»/«Сменить
  фото» (+ optional «Убрать фото» if photo set) opening hidden `<input type=file accept="image/*">`; chosen photo
  is held in form state and saved with the profile; failure shows an inline error key — files: `src/ui/photo.ts`,
  `src/ui/photo.test.ts`, `src/ui/Profile.tsx`, `src/ui/Profile.css`, `src/i18n/{ru,en,uk}.ts` — verify:
  `npm test`; manual on desktop and (if possible) iPhone: large photo → stored ≤256 px (check data URL size in
  devtools), avatar updates, removing works.
  Note: Avatar in button mode must always get `label` (accessible name; photo img has alt="").
- [ ] 17. Settings: language and theme — `Profile.tsx` «Настройки» section: Card with «Язык» SegmentedControl
  (Русский / English / Українська — names always in their own language, not translated) and «Тема» SegmentedControl
  (Системная / Светлая / Тёмная, translated); wired to `setLang` and `applyTheme` + `savePrefs`. Section is visible
  in both view and edit mode and independent of profile existence — files: `src/ui/Profile.tsx`,
  `src/ui/Profile.css`, `src/i18n/{ru,en,uk}.ts`, `src/ui/prefs.ts` (small persist helper if missing) — verify:
  `npm run build`; manual: switching language retranslates all tabs instantly and survives reload; theme switch
  applies instantly, survives reload, «Системная» follows OS.
- [ ] 18. Clear all data — `Profile.tsx`: quiet `neg` full-width «Очистить все данные» + muted caption «Удалит
  профиль, привычки, историю и рейтинг»; `Dialog` titled «Удалить все данные?» with the agreed text, `danger`
  «Удалить» and default «Отмена» (gets `autoFocus`); confirm → `clearAllData()`, remove `life-elo:prefs`, `location.reload()`; errors
  show inline in the dialog. No profile/habits remain, Elo starts at 0 — files: `src/ui/Profile.tsx`,
  `src/ui/Profile.css`, `src/i18n/{ru,en,uk}.ts` — verify: `npm run build`; manual: with habits, reviews and a
  profile, cancel (overlay, Esc, button) changes nothing; confirm leaves empty Home (0, no history), Habits empty,
  Profile in edit mode, language ru, theme system.
  Note: clearAllData: derive the table list once (e.g. `db.tables`) instead of duplicating it in the transaction scope and the map.
- [ ] 19. Docs and sync notes — `AGENTS.md` (UI language: ru/en/uk via `src/i18n`, ru is the key source of truth;
  update the `src/ui/components/` gotcha list to include Field/Avatar/Dialog if their props are in `dtsPropsFor`;
  keep Gotchas ≤10 lines), `docs/ROADMAP.md` (check «Профиль и настройки»), `.design-sync/NOTES.md` (new
  components, prefs/theme selectors), set this plan's status to `done` — files: `AGENTS.md`, `docs/ROADMAP.md`,
  `.design-sync/NOTES.md`, `docs/plans/04-profile-settings.md` — verify: `npm test`, `npm run lint`,
  `npm run build` all pass; the user runs `/design-sync` afterwards.
