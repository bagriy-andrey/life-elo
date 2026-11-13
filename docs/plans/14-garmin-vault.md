# 14 — Garmin credentials in Supabase Vault

Status: done
Design input: none

## Why
Plan 13 stores the Garmin Personal API key and the 24 h bearer token as plain text in
`public.garmin_credentials` (RLS, no client access, but readable by anyone with DB admin access, dashboard
or backups). The user asked for secure storage (2026-11-11): keep secrets encrypted at rest in Supabase Vault
(`supabase_vault`, installed); only the Edge Functions decrypt. No product/scoring change.

## Acceptance criteria
- THE table `garmin_credentials` SHALL hold no plaintext secret: only `api_key_secret_id` / `token_secret_id`
  (uuid → `vault.secrets`), `key_expires_at`, `token_expires_at`, `last_pull_at`, `created_at`.
- WHEN the user connects again THE existing Vault secrets SHALL be updated in place (no orphaned secrets).
- WHEN the user disconnects or «Удалить все данные» THE Vault secrets SHALL be deleted with the row.
- Vault access only via `security definer` functions with `set search_path = ''`, executable by
  `service_role` only (revoked from public/anon/authenticated), except `delete_own_garmin_credentials()`
  which stays callable by `authenticated` and only touches `auth.uid()`'s row and secrets.
- The functions' external behaviour (requests/responses of `garmin-connect` / `garmin-pull`) is unchanged;
  the key/token are never logged or returned.

## Open questions
(none)

## Decisions
- Production had 1 row with plaintext credentials (user connected 2026-11-11), so the migration moves them into Vault
  (same helper, names `garmin_key_<user>` / `garmin_token_<user>`, secret ids set) in one transaction, then drops `api_key` / `token`.
- RPCs (public schema, service_role only): `garmin_save_key(p_user uuid, p_key text, p_key_expires_at timestamptz,
  p_token text, p_token_expires_at timestamptz)`, `garmin_get_secrets(p_user uuid) returns (api_key, token,
  token_expires_at, key_expires_at, last_pull_at)`, `garmin_save_token(p_user, p_token, p_token_expires_at)`,
  `garmin_delete(p_user)`. Secret names `garmin_key_<user>` / `garmin_token_<user>` (unique), via
  `vault.create_secret` / `vault.update_secret`, read via `vault.decrypted_secrets`.
- Edge Functions call these RPCs with the service-role supabase-js client (`.rpc(...)`); the direct Postgres
  connection in `garmin-pull` stays only for the records upsert.
- Version: `0.14.0`.

## Steps
- [x] 1. Migration `supabase/migrations/20261111010000_garmin_vault.sql`: emptiness assert; add secret-id columns;
  drop `api_key`, `token`; the four RPCs + updated `delete_own_garmin_credentials()` (deletes Vault secrets too);
  grants as above. Apply: the user runs `npx supabase db push --remote --yes`; then read-only check of columns,
  function owners/grants — files: the migration — verify: remote read-only query.
- [x] 2. Edge Functions use the RPCs (connect: save/delete/status; pull: get secrets, save refreshed token);
  redeploy (user runs `npx supabase functions deploy garmin-connect garmin-pull --yes`); smoke check
  (401 without user, CORS) — files: `supabase/functions/_shared/garmin.ts`, `supabase/functions/garmin-connect/index.ts`,
  `supabase/functions/garmin-pull/index.ts`, `docs/setup/backend.md` (Vault note) — verify: verifier code review + smoke.
