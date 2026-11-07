# 06 — Integrate accounts & sync with profile/settings/i18n (main)

Status: done
Design input: Claude Design project 67c2bfac-e6da-422e-98bb-a3415b430a31 (`templates/auth/Auth.dc.html`,
`templates/profile/Profile.dc.html`; components Field, Avatar, Dialog already synced from main).

## Why
Plan 05 (`05-auth-sync.md`) was built on a stale `main`; PR #4 (profile, settings, ru/en/uk i18n, Field/Avatar/
Dialog) was merged meanwhile. The merge commit resolved conflicts mechanically: Dexie sync tables moved to v4
(v3 = `profile` from main), plan 05's profile screen became `src/ui/Account.tsx` embedded in main's
`Profile` via an `account` prop, providers nested (`I18nProvider` > `AuthProvider`). Agreed with the user on
2026-11-06: keep `Field` (drop `TextField`), sync the local profile across devices.

## Acceptance criteria
- WHEN the language is en or uk THE auth screens, «Новый пароль», first-sign-in choice/waiting screens,
  account block, password screen and all auth/sync error texts SHALL be shown in that language
  (no hardcoded Russian left outside `src/i18n/ru.ts`; `authErrorText` returns i18n keys or takes `t`).
- THE app SHALL have one labelled-input component: `Field`. `TextField` is removed; `PasswordField` is built on
  `Field` (toggle «Показать/Скрыть» + strength meter keep working); design-sync config/previews/AGENTS.md updated.
- WHEN the profile (name, nick, email, birth, photo) is edited on device A THE same profile SHALL appear on
  device B after sync. Server check constraint accepts `tbl = 'profile'` (new migration, user runs
  `npx supabase db push --remote`). Language/theme stay per device (localStorage) — documented.
- First sign-in counts include the profile table (a device with only a profile counts as non-empty).
- WHEN a signed-in user confirms «Удалить все данные» THE app SHALL delete the account's data on the server
  (`reset_records`) and locally, keep the user signed in, and not re-download it; dialog text says the data is
  deleted on all devices. Offline → error text, nothing deleted.
- Profile tab: one screen — profile, then account block (email, sync status, password, logout), then settings;
  no duplicate headings; `renderToString` smoke tests per AGENTS.md for Account, auth screens, SyncChoice.
- Upgrading a v3 (main) database to v4 keeps profile and all data (test with fake-indexeddb).

## Open questions
(none — defaults: language/theme not synced; «Удалить все данные» deletes everywhere while signed in)

## Steps
- [x] 1. Merge resolution follow-ups + v3→v4 upgrade test (main-v3 DB with profile + habits opens at v4 with data,
  outbox empty) — files: `src/sync/outbox.test.ts` — verify: `npm test`.
- [x] 2. Profile sync: add `profile` to `SYNCED_TABLES` (key `id`), counts in `firstSignIn`, migration
  `supabase/migrations/<ts>_records_profile.sql` (replace the `tbl` check constraint), tests (enqueue on
  `saveProfile`, convergence of a profile between two fake devices) — files: `src/sync/outbox.ts`,
  `src/sync/firstSignIn.ts`, tests, migration, `docs/setup/backend.md` (re-run db push) — verify: `npm test`.
- [x] 3. «Удалить все данные» while signed in: route through sync (disable engine → `remote.reset()` →
  clear local synced tables + outbox, keep `syncState.userId`, cursor 0 → enable); offline → error; update i18n
  dialog texts in ru/en/uk (note: clearAllData removed, unreachable; ClearData gets onClearData prop from App) — files: `src/db/profile.ts` or new `src/sync/wipe.ts`, `src/ui/Profile.tsx`,
  `src/i18n/*.ts`, tests — verify: `npm test`.
- [x] 4. [design-sync] `PasswordField` on top of `Field` (add trailing slot to Field if needed), switch
  AuthScreen/NewPassword/ProfilePassword to `Field`, delete `TextField` (+ preview, dtsPropsFor, override,
  conventions, AGENTS.md gotcha) — files: `src/ui/components/{Field,PasswordField}.*`, `TextField.*` (delete),
  `src/ui/auth/*.tsx`, `src/ui/ProfilePassword.tsx`, `.design-sync/*`, `AGENTS.md` — verify: build, lint, tests.
- [x] 5. i18n of auth: keys `auth.*`, `sync.*`, `account.*`, `password.*` in ru/en/uk (ru = source of truth;
  en/uk translated), `validate()`/`authErrorText` return keys, all auth/sync/account screens use `t()`;
  `formatSynced` uses the i18n locale — files: `src/i18n/{ru,en,uk}.ts`, `src/auth/{validation,errors}.ts` (+tests),
  `src/ui/auth/*.tsx`, `src/ui/{Account,ProfilePassword,SyncChoice}.tsx`, `src/App.tsx` — verify: `npm test`
  (i18n key parity test), grep for Cyrillic outside `src/i18n` and tests.
  Note: `PasswordField` now takes required `showLabel`/`hideLabel` + optional `strengthLabels` props (dtsPropsFor and preview updated); new helper `src/ui/auth/passwordLabels.ts`; `ActionResult.error` is an i18n key; `AUTH_FALLBACK_TEXT` renamed `AUTH_FALLBACK` (key).
- [x] 6. Profile tab layout polish + smoke tests: Account block styles consistent with Profile.css (no `auth-link`
  import from AuthScreen.css in Account), `renderToString` tests for AuthScreen, NewPassword, SyncChoice, Account,
  ProfilePassword — files: `src/ui/Account.tsx`, `src/ui/Profile.css`, `src/ui/*.test.tsx` — verify: `npm test`, build.
  Note: also exported `AuthContext` (test fake), `useSyncStatus` got a server snapshot (SSR), new key `account.sync`, test helper `src/ui/authTestUtils.tsx`; Account reuses Profile.css classes (`profile-rows`, `clear-btn`, `settings-title`).
- [x] 7. Docs: AGENTS.md layout/rules, `docs/setup/backend.md` (profile synced, prefs per device, second migration),
  README, HANDOFF; then the user runs `/design-sync` — files: docs — verify: read-through.
