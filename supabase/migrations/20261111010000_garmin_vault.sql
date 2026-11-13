-- Garmin credentials move from plaintext columns to Supabase Vault (encrypted at rest).
-- Existing plaintext rows are moved into Vault by the data migration below, then the plaintext columns are dropped.
alter table public.garmin_credentials
  add column api_key_secret_id uuid,
  add column token_secret_id uuid;
-- Internal helper: create or update a Vault secret by id, falling back to a leftover secret with the same name.
create or replace function public.garmin_upsert_secret(p_id uuid, p_name text, p_secret text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid;
begin
  if p_id is not null then
    select s.id into sid from vault.secrets s where s.id = p_id;
  end if;
  if sid is null then
    select s.id into sid from vault.secrets s where s.name = p_name;
  end if;
  if sid is not null then
    perform vault.update_secret(sid, p_secret);
    return sid;
  end if;
  return vault.create_secret(p_secret, p_name);
end $$;

create or replace function public.garmin_save_key(
  p_user uuid, p_key text, p_key_expires_at timestamptz, p_token text, p_token_expires_at timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  kid uuid;
  tid uuid;
begin
  select c.api_key_secret_id, c.token_secret_id into kid, tid
    from public.garmin_credentials c where c.user_id = p_user;
  kid := public.garmin_upsert_secret(kid, 'garmin_key_' || p_user::text, p_key);
  if p_token is not null then
    tid := public.garmin_upsert_secret(tid, 'garmin_token_' || p_user::text, p_token);
  end if;
  insert into public.garmin_credentials as c
    (user_id, api_key_secret_id, key_expires_at, token_secret_id, token_expires_at)
  values (p_user, kid, p_key_expires_at, tid, case when p_token is null then null else p_token_expires_at end)
  on conflict (user_id) do update
    set api_key_secret_id = excluded.api_key_secret_id,
        key_expires_at = excluded.key_expires_at,
        token_secret_id = excluded.token_secret_id,
        token_expires_at = excluded.token_expires_at;
end $$;

create or replace function public.garmin_get_secrets(p_user uuid)
returns table (api_key text, token text, token_expires_at timestamptz, key_expires_at timestamptz, last_pull_at timestamptz)
language sql security definer set search_path = '' as $$
  select k.decrypted_secret, t.decrypted_secret, c.token_expires_at, c.key_expires_at, c.last_pull_at
  from public.garmin_credentials c
  left join vault.decrypted_secrets k on k.id = c.api_key_secret_id
  left join vault.decrypted_secrets t on t.id = c.token_secret_id
  where c.user_id = p_user
$$;

create or replace function public.garmin_save_token(p_user uuid, p_token text, p_token_expires_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  tid uuid;
begin
  select c.token_secret_id into tid from public.garmin_credentials c where c.user_id = p_user;
  if not found then return; end if;
  tid := public.garmin_upsert_secret(tid, 'garmin_token_' || p_user::text, p_token);
  update public.garmin_credentials
    set token_secret_id = tid, token_expires_at = p_token_expires_at
    where user_id = p_user;
end $$;

create or replace function public.garmin_delete(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from vault.secrets s
    where s.id in (select c.api_key_secret_id from public.garmin_credentials c where c.user_id = p_user)
       or s.id in (select c.token_secret_id from public.garmin_credentials c where c.user_id = p_user)
       or s.name in ('garmin_key_' || p_user::text, 'garmin_token_' || p_user::text);
  delete from public.garmin_credentials where user_id = p_user;
end $$;

-- Caller-scoped: only auth.uid()'s row and secrets.
create or replace function public.delete_own_garmin_credentials() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform public.garmin_delete(auth.uid());
end $$;

-- Data migration (same transaction): plaintext -> Vault secrets. Never logs values; re-runnable per row.
do $$
declare
  r record;
begin
  for r in select user_id, api_key, token from public.garmin_credentials
           where api_key is not null or token is not null loop
    if r.api_key is not null then
      update public.garmin_credentials
        set api_key_secret_id = public.garmin_upsert_secret(api_key_secret_id, 'garmin_key_' || r.user_id::text, r.api_key)
        where user_id = r.user_id;
    end if;
    if r.token is not null then
      update public.garmin_credentials
        set token_secret_id = public.garmin_upsert_secret(token_secret_id, 'garmin_token_' || r.user_id::text, r.token)
        where user_id = r.user_id;
    end if;
  end loop;
end $$;

alter table public.garmin_credentials
  drop column api_key,
  drop column token;

revoke all on function public.garmin_upsert_secret(uuid, text, text) from public, anon, authenticated;
revoke all on function public.garmin_save_key(uuid, text, timestamptz, text, timestamptz) from public, anon, authenticated;
revoke all on function public.garmin_get_secrets(uuid) from public, anon, authenticated;
revoke all on function public.garmin_save_token(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.garmin_delete(uuid) from public, anon, authenticated;
grant execute on function public.garmin_save_key(uuid, text, timestamptz, text, timestamptz) to service_role;
grant execute on function public.garmin_get_secrets(uuid) to service_role;
grant execute on function public.garmin_save_token(uuid, text, timestamptz) to service_role;
grant execute on function public.garmin_delete(uuid) to service_role;
revoke all on function public.delete_own_garmin_credentials() from public, anon;
grant execute on function public.delete_own_garmin_credentials() to authenticated;
