-- Garmin sync: allow tbl = 'garmin' (written only by the Edge Function with the service role),
-- and a credentials table that clients can never touch.
alter table public.records drop constraint if exists records_tbl_check;
alter table public.records
  add constraint records_tbl_check
  check (tbl in ('habits','reviews','events','wellbeing','rewards','profile','garmin'));

create table public.garmin_credentials (
  user_id uuid primary key references auth.users on delete cascade,
  api_key text not null,
  key_expires_at timestamptz not null,
  token text,
  token_expires_at timestamptz,
  last_pull_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.garmin_credentials enable row level security;
-- No policies and no grants: only the service role (Edge Functions) reads/writes this table.
revoke all on public.garmin_credentials from anon, authenticated;

-- Clients may not create or modify 'garmin' records (select stays allowed).
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated
  with check (user_id = auth.uid() and tbl <> 'garmin');
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
  using (user_id = auth.uid() and tbl <> 'garmin')
  with check (user_id = auth.uid() and tbl <> 'garmin');

-- push_records: same body as before, but 'garmin' items are silently ignored.
create or replace function public.push_records(items jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare
  accepted int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  with incoming as (
    select distinct on (x.tbl, x.key) * from jsonb_to_recordset(items) as x(
      tbl text, key text, data jsonb, deleted boolean, schema int, client_updated_at timestamptz
    )
    where x.tbl is distinct from 'garmin'
    order by x.tbl, x.key, x.client_updated_at desc
  ), upserted as (
    insert into public.records as r (user_id, tbl, key, data, deleted, schema, client_updated_at, rev)
    select auth.uid(), i.tbl, i.key, case when coalesce(i.deleted, false) then null else i.data end,
           coalesce(i.deleted, false), i.schema, i.client_updated_at, nextval('public.records_rev_seq')
    from incoming i
    on conflict (user_id, tbl, key) do update
      set data = excluded.data,
          deleted = excluded.deleted,
          schema = excluded.schema,
          client_updated_at = excluded.client_updated_at,
          rev = nextval('public.records_rev_seq')
      where excluded.client_updated_at >= r.client_updated_at
    returning 1
  )
  select count(*) into accepted from upserted;
  return accepted;
end $$;

-- Small security-definer helper: deletes only the caller's own credentials row.
create or replace function public.delete_own_garmin_credentials() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from public.garmin_credentials where user_id = auth.uid();
end $$;
revoke all on function public.delete_own_garmin_credentials() from public, anon;
grant execute on function public.delete_own_garmin_credentials() to authenticated;

-- reset_records: body unchanged (garmin records get tombstoned with the rest) + drop the stored key.
create or replace function public.reset_records() returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  update public.records
    set deleted = true, data = null, rev = nextval('public.records_rev_seq')
    where user_id = auth.uid() and not deleted;
  perform public.delete_own_garmin_credentials();
end $$;

revoke all on function public.push_records(jsonb) from public, anon;
revoke all on function public.reset_records() from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;
grant execute on function public.reset_records() to authenticated;
