-- Plan 15: pull diagnostics. Written only by the Edge Function (service role); no grant changes.
alter table public.garmin_credentials
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error text;
