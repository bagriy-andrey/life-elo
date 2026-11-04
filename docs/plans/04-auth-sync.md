# 04 — Accounts (email / Google), password recovery, cloud sync

Status: approved
Design input: Claude Design project 67c2bfac-e6da-422e-98bb-a3415b430a31, `templates/auth/Auth.dc.html`
(screens: login, register, forgot, change password; prop `googleOnly` for a Google-only account).

## Why
ROADMAP §5 «Аккаунты и синхронизация»; product context §12 lists authentication as an architecture boundary.
The app is local-only (Dexie), so history lives on one phone and is lost with it. Goal: a required account
(email + password or Google), password reset by email, and offline-first sync of all local data across devices.
Agreed with the user on 2026-11-04: Supabase; sign-in required; **no** email confirmation; sync is offline-first
with background push/pull; first login uploads local data if the account is empty, otherwise asks; deploy to
Vercel is part of this plan; email goes through Resend SMTP on the user's own domain.

## Spec

### Architecture
- Backend = Supabase (Auth + Postgres + RLS). No custom server: all backend code is SQL in `supabase/migrations/`
  plus dashboard config documented in `docs/setup/backend.md`. Client uses `@supabase/supabase-js` with the
  publishable key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; `.env.example`, never commit `.env`).
- Dexie stays the app's only read model. UI keeps reading through `useLiveQuery`; rating/streaks are still derived
  by `replay` and **never stored on the server**. Sync moves raw records only.
- New code: `src/auth/` (client, session provider, validation, error texts), `src/sync/` (outbox, merge rules,
  remote calls, engine), screens in `src/ui/auth/` and `src/ui/Profile*.tsx`.

### Auth behaviour
- Session gate in `App`: while the session loads → neutral splash (logo only); no session → auth screen;
  recovery link in URL → «Новый пароль» screen; otherwise the app. Supabase keeps the session in localStorage,
  so a signed-in user opens the app offline; a failed token refresh offline must not sign the user out.
- Register: name, email, password, confirm (validation exactly as in the design: email regex, ≥8 chars, at least
  one letter and one digit, confirm matches; errors on blur or after first submit). `signUp` with
  `options.data.name`; confirmation is off, so the user is signed in immediately (the design's «Мы отправили письмо
  для подтверждения» text is dropped). Existing email → «Аккаунт с этой почтой уже есть. Войдите или восстановите
  пароль.»
- Login: email + password; any credential failure → «Неверная почта или пароль» (no account enumeration).
- Google: `signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })`, same button on
  login and register. Name comes from Google `full_name`. If an email/password account with the same address
  exists, Supabase links the identity (verify in step 4 and record the actual behaviour in the setup doc).
- Forgot: email → `resetPasswordForEmail(email, { redirectTo: origin })`. Always show «Письмо отправлено на
  {email}. Ссылка действует 1 час.» (even for unknown emails) + «Отправить ещё раз». HTTP 429 → «Слишком часто.
  Подождите минуту и попробуйте снова.»
- Recovery link: the email template links to `{{ .SiteURL }}/?type=recovery&token_hash={{ .TokenHash }}` and the
  app calls `verifyOtp({ type: 'recovery', token_hash })`, then shows «Новый пароль» (new + confirm, same
  validation, auth layout). **Why not the default PKCE link:** on iPhone the mail link opens in Safari, which does
  not share storage with the installed PWA, so a PKCE code verifier would be missing. After saving: «Пароль
  изменён. Войдите в приложении с новым паролем.» and the URL params are removed (`history.replaceState`).
  Invalid/expired token → «Ссылка устарела или уже использована. Запросите новую.» + button to the forgot screen.
- Change password (Профиль → «Сменить пароль»), as designed: current, new, confirm. Current password is checked by
  `signInWithPassword` with the user's email, then `updateUser({ password })`, then `signOut({ scope: 'others' })`.
  Success text from the design. «Не помню текущий пароль» → signs out to the forgot screen with email prefilled.
- Google-only account (`googleOnly`): no `email` identity and `user_metadata.password_set !== true`. Shows the
  design's info card (with the real email) and no current-password field; button «Задать пароль»; on success also
  `updateUser({ data: { password_set: true } })`.
- Server-side password policy mirrors the client: min length 8, letters + digits.
- Terms line under «Создать аккаунт» is omitted until terms/privacy documents exist.

### Profile tab
TabBar gains a 4th tab «Профиль» (the design shows it). The screen has: name, email, sync status line, «Сменить
пароль» / «Задать пароль», «Выйти». Sync status texts: «Синхронизировано · HH:MM», «Синхронизация…»,
«Нет сети — изменения сохранены на устройстве», «Ошибка синхронизации» + «Повторить».
Logout: try a push first; if unsynced changes remain → inline confirm «Есть несинхронизированные изменения. Если
выйти, они пропадут.» (Выйти / Отмена). Then clear every Dexie table + sync state, `signOut()`, show login.

### Data model (server)
One generic table instead of mirroring each domain type in SQL. Domain shapes keep evolving through Dexie
migrations; the server stores each record as JSON tagged with the client schema version.

```sql
records(
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tbl text not null check (tbl in ('habits','reviews','events','wellbeing','rewards')),
  key text not null,                 -- habit/event/reward id, or DayKey for reviews/wellbeing
  data jsonb,                        -- null when deleted
  deleted boolean not null default false,
  schema int not null,               -- Dexie version that wrote `data`
  client_updated_at timestamptz not null,
  rev bigint not null,               -- from sequence records_rev_seq, bumped on every accepted write
  primary key (user_id, tbl, key)
)
index (user_id, rev)
```
- RLS on, policies `user_id = auth.uid()` for select/insert/update/delete.
- `push_records(items jsonb) returns int` (security invoker): takes `pg_advisory_xact_lock(hashtext(auth.uid()::text))`
  so one user's pushes are serialized (rev order = commit order, which makes the pull cursor safe), then upserts
  each item, accepting it only when `excluded.client_updated_at >= records.client_updated_at` (last edit wins);
  every accepted write takes a new `rev`. Returns the number accepted.
- `reset_records() returns void`: deletes all of the caller's rows (used by «Оставить данные устройства»).

### Sync protocol (client)
- Dexie v3 adds `outbox: '[tbl+key]'` (`{ tbl, key, changedAt }`) and `syncState: 'id'`
  (`{ id: 'state', userId, cursor, lastSyncedAt }`). Dexie hooks on the 5 synced tables enqueue every
  create/update/delete into `outbox` in the same transaction (re-enqueue overwrites `changedAt`). Writes coming from
  a pull are marked on the transaction and skipped by the hooks.
- Push: read outbox, load each current local row (missing → tombstone), call `push_records` in batches of 200,
  delete those outbox entries whose `changedAt` did not change meanwhile.
- Pull: `select … where rev > cursor order by rev limit 500` until empty. For each record: if an outbox entry exists
  for that key with `changedAt > client_updated_at`, keep local (it will be pushed); otherwise put/delete locally.
  `schema` greater than the local Dexie version → stop, keep the cursor, status «Обновите приложение»;
  lower → run the existing migrate functions before writing. Cursor = max rev applied.
- Order: push then pull. Triggers: after sign-in, app start, `online`, `visibilitychange` → visible, and 2 s after
  the last local write (debounced). One run at a time. Errors only change status; never block the UI.
- Replay over merged data must tolerate review entries for habits that do not exist locally (ignored).
- Profile has a hidden-but-reachable «Синхронизировать заново» (cursor = 0, full pull, idempotent) for recovery.

### First sign-in on a device
`syncState.userId` empty or different from the session user →
- remote empty (`count` = 0): enqueue all local rows, set `userId`, run sync (upload);
- local empty: set `userId`, pull;
- both non-empty: screen «На устройстве и в аккаунте есть данные» with «Оставить данные аккаунта» (clear local,
  pull) and «Оставить данные устройства» (`reset_records()`, enqueue all local, push) + muted note that the other
  copy is deleted. No merge.

### Design mapping
- Inputs, password show/hide, strength meter, success/error notices: new components (steps 5–6).
- Strength meter amber `#d39a2b` → new token `--warn` (light + dark).
- Not in the design, built from existing Card/Button + new components: «Новый пароль» (recovery), first-sign-in
  choice, Profile screen. After the plan, the user may redraw them in Claude Design.
- Auth screen layout (logo row, title, subtitle, Google button, «или по почте» divider, footer link) is
  screen-specific CSS in `src/ui/auth/AuthScreen.css` using tokens only.

### Not in scope
Account deletion, changing email, email confirmation, Apple sign-in, realtime push between devices, field-level merge.

## Acceptance criteria
- WHEN there is no session THE app SHALL show only the auth screens (login by default).
- WHEN the user registers with valid name/email/password THE app SHALL create the account and open the app
  without an email confirmation step.
- WHEN login fails for any credential reason THE app SHALL show «Неверная почта или пароль».
- WHEN the user taps the Google button and completes consent THE app SHALL open signed in (desktop Safari/Chrome and
  the installed iPhone PWA are both checked manually; failure on iPhone is reported, not worked around silently).
- WHEN the user requests a reset THE app SHALL show the same success text regardless of whether the email exists,
  and the email (sent from the user's domain via Resend, Russian text) SHALL contain a link valid for 1 hour.
- WHEN the recovery link is opened in any browser THE app SHALL allow setting a new password; afterwards login with
  the new password works in the PWA and the old one does not.
- WHEN a signed-in user changes the password with a correct current password THE app SHALL save it and end
  sessions on other devices; with a wrong current password it SHALL show «Текущий пароль указан неверно».
- WHEN a Google-only user opens password settings THE app SHALL offer «Задать пароль» without a current field.
- WHEN data changes on device A THE same data SHALL appear on device B after its next sync trigger, and the rating
  on both devices SHALL be equal (replay of identical data).
- WHEN edits are made offline THE app SHALL keep working and push them on reconnect; for the same record the edit
  with the later `client_updated_at` wins.
- WHEN a device with local data signs in to an empty account THE local data SHALL be uploaded; WHEN both have
  data THE app SHALL ask which copy to keep.
- WHEN the user signs out THE device SHALL hold no data of that account.
- No row of another user is readable or writable (RLS), checked manually with two accounts.
- Rating/streaks SHALL NOT be stored on the server; all AGENTS.md rating rules keep holding.

## Open questions
(none — defaults chosen above: terms line omitted, no account deletion yet, Google linking per Supabase default)

## Steps
- [x] 1. Docs & config: AGENTS.md (stack: Supabase; layout `src/auth/`, `src/sync/`, `supabase/`; rule «rating is
  never stored on the server»; remove «No backend»), product context §13 decision entry (2026-11-04 decisions from
  «Why»), `.env.example`, `.gitignore` has `.env*` except example, `docs/setup/backend.md` — the user's manual
  checklist, written for someone creating every account from scratch (the user has none yet), in this order:
  0) buy a domain (Cloudflare Registrar or Porkbun; it is only needed for the email sender — the app runs on
  `*.vercel.app`; until Resend is ready, Supabase's built-in mailer reaches the project owner's own email, enough
  for testing); create Supabase project; Auth settings (email confirmation OFF, OTP expiry 3600 s, min password 8 +
  letters & digits, Site URL = Vercel URL, redirect allowlist: Vercel URL + `http://localhost:5173`); Google Cloud
  OAuth client (consent screen, authorized redirect = Supabase callback) → Supabase Google provider; Resend domain
  + DNS records → Supabase custom SMTP (sender `Life Elo <no-reply@DOMAIN>`); paste recovery template from
  `supabase/templates/recovery.html`; `npx supabase link` + `db push`; Vercel project + env vars — files:
  `AGENTS.md`, `LIFE_ELO_PRODUCT_CONTEXT.md`, `.env.example`, `.gitignore`, `docs/setup/backend.md` — verify: read-through.
- [x] 2. Backend schema: `npx supabase init` (config only), migration with `records`, sequence, index, RLS policies,
  `push_records`, `reset_records`; Russian recovery email template (subject «Восстановление пароля Life Elo», link
  `{{ .SiteURL }}/?type=recovery&token_hash={{ .TokenHash }}`, «Ссылка действует 1 час») — files:
  `supabase/config.toml`, `supabase/migrations/<ts>_records.sql`, `supabase/templates/recovery.html`, `package.json`
  (devDep `supabase`) — verify: if Docker is available `npx supabase start && npx supabase db reset` applies cleanly;
  otherwise SQL review + user runs `db push`; note which in the step.
  Note: Docker unavailable, SQL reviewed only (not applied); user runs `db push`. `rev` has a column default from the sequence too.
- [x] 3. Pure auth helpers from the design: `EMAIL_RE`, `strength`, `newPasswordError`, `validateAuthForm(screen, f,
  googleOnly)`, `authErrorText(error)` (Supabase error code/status → Russian texts in the Spec) — files:
  `src/auth/validation.ts`, `src/auth/validation.test.ts`, `src/auth/errors.ts`, `src/auth/errors.test.ts` — verify: `npm test`.
  Note: exported as `validate`/`newPwErr` (design names) plus aliases `validateAuthForm`/`newPasswordError`; screen `recovery` added.
- [x] 4. Supabase client + `AuthProvider`/`useAuth` (session, loading, `googleOnly`, recovery-token handling from URL,
  actions: signIn, signUp, google, resetPassword, setNewPassword, changePassword, signOut) — files:
  `src/auth/supabase.ts`, `src/auth/AuthProvider.tsx`, `src/auth/recoveryUrl.ts` (+ test for URL parsing),
  `package.json` — verify: `npm test`, `npm run build`; record Google↔email linking behaviour in `docs/setup/backend.md`
  once the user has the project configured.
  Note: Google↔email linking NOT verified (no project yet): TODO manual check, then record in `docs/setup/backend.md`. Extras: `googleOnly.ts` (+test), `src/vite-env.d.ts`; `errors.ts` tidied (no `bad_jwt`, /link.*(invalid|expired)/). Provider exposes `configured`, `recovery` state, `dismissRecovery`.
- [x] 5. [design-sync] `TextField` (label, input props, error text, `aria-invalid`, optional trailing slot) and
  `Notice` (`tone: 'success' | 'error'`, role status/alert); token `--warn`; move the global text-input styles
  from `src/index.css` into `TextField.css` if nothing else uses them; previews; `.design-sync/config.json`
  `dtsPropsFor` entries; update the AGENTS.md gotcha about TextInput — files: `src/ui/components/TextField.{tsx,css}`,
  `Notice.{tsx,css}`, `index.ts`, `src/ui/tokens.css`, `.design-sync/…` — verify: `npm run build`, `npm run lint`.
  Note: global `input` styles stay in `src/index.css` (Habits/Review still use raw inputs); TextField.css only adds sizing/error/trailing.
- [x] 6. [design-sync] `PasswordField` (TextField + «Показать/Скрыть» toggle, optional 3-segment strength meter with
  labels «Слабый/Нормальный/Надёжный пароль») — files: `src/ui/components/PasswordField.{tsx,css}`, `index.ts`,
  preview, `.design-sync/config.json` — verify: `npm run build`, `npm run lint`.
- [x] 7. Auth screen (login / register / forgot + resend) per design and Spec texts, busy state «Подождите…»,
  email kept when switching screens; gate in `App.tsx` (splash / auth / app) with `AuthProvider` in `main.tsx` —
  files: `src/ui/auth/AuthScreen.{tsx,css}`, `src/App.tsx`, `src/main.tsx` — verify: `npm run build`; manual in
  `npm run dev` against the configured project: register, logout via devtools, login, wrong password, forgot.
  Note: manual check against a real project pending (user). Gate: `recovery !== null` returns null until step 8. `AuthLogo` exported from AuthScreen.tsx.
- [x] 8. «Новый пароль» recovery screen (auth layout, expired-link state, clears URL) — files:
  `src/ui/auth/NewPassword.tsx`, `src/App.tsx` (gate checks `recovery !== null` BEFORE `session`, since verifyOtp
  creates a session; `dismissRecovery` in state `ready` signs out) — verify: build; manual: real email link from Resend → set password → login.
  Note: manual email check pending (user). `dismissRecovery` now signs out in `ready`; `AuthScreen` got `initialMode` prop; `.auth-link` padding enlarged.
- [x] 9. Dexie v3: `outbox`, `syncState`, hooks enqueueing changes with remote-apply bypass, `clearLocalData()` —
  files: `src/db/db.ts`, `src/sync/outbox.ts`, `src/sync/outbox.test.ts`, `package.json` (devDep `fake-indexeddb`)
  — verify: tests: create/update/delete/`deleteHabit` enqueue; remote-applied writes do not; v2→v3 upgrade keeps data.
  Note: DBCore middleware instead of hooks (adds `outbox` to every rw transaction); `changedAt` stored in ms; `applyRemote` flags the IDB transaction.
- [x] 10. Pure sync rules: `applyDecision(remote, outboxEntry)`, `firstSignInMode(localCount, remoteCount,
  syncedUserId, userId)`, schema gate; test that `replay` ignores entries of unknown habits (fix if not, without
  changing scoring) — files: `src/sync/merge.ts`, `src/sync/merge.test.ts`, `src/engine/rating.test.ts` — verify: `npm test`.
- [ ] 11. Sync engine: `remote.ts` (push RPC, paged pull, count, reset), `engine.ts` (single-flight push→pull,
  triggers, debounce, status store + `useSyncStatus`) — files: `src/sync/remote.ts`, `src/sync/engine.ts`,
  `src/sync/engine.test.ts` (with a fake remote), `src/App.tsx` — verify: `npm test`; manual: two browsers, edit in one,
  see it in the other.
  Note: manual two-browser check pending (user). Sync starts in App only when syncState.userId === session user (TODO hook for step 12). Tests simulate devices by snapshot/restore of one fake-indexeddb.
- [ ] 12. First sign-in flow + choice screen — files: `src/sync/firstSignIn.ts`, `src/ui/SyncChoice.tsx`, `src/App.tsx`
  — verify: tests for the flow with a fake remote; manual: existing local data → empty account uploads.
- [ ] 13. Profile tab: TabBar 4th item «Профиль», `Profile.tsx` (name, email, sync status, «Синхронизировать заново»,
  logout with unsynced-changes confirm; clear Dexie ONLY on explicit logout, never on a `SIGNED_OUT` event — a
  recovery elsewhere signs out globally and unsynced edits must survive until the next sign-in of the same user) — files: `src/ui/Profile.tsx`, `src/App.tsx` — verify: build, lint; manual
  logout leaves IndexedDB empty.
- [ ] 14. Change / set password screen per design (current check, `signOut others`, Google-only mode, «Не помню
  текущий пароль») — files: `src/ui/ProfilePassword.tsx`, `src/ui/Profile.tsx` — verify: build; manual both modes.
- [ ] 15. Vercel: confirm SPA/PWA serve `/?type=recovery…` (no rewrite needed; add `vercel.json` only if required),
  README «Деплой и установка на iPhone»; ROADMAP: mark deploy item, remove the iOS note at the end of the product
  context — files: `README.md`, `docs/ROADMAP.md`, `LIFE_ELO_PRODUCT_CONTEXT.md`, `vercel.json` (optional) — verify:
  user deploys; manual E2E on iPhone PWA: register, Google, forgot → Safari reset → PWA login, two-device sync,
  offline edit then reconnect, RLS check with a second account. Record results in this step's note.
