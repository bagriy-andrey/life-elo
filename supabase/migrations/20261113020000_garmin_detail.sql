-- Garmin day detail: records.tbl = 'garmin_detail' (sanitized per-day Garmin data, written only by garmin-pull
-- with the service role). Clients may not write it; sync pulls it like 'garmin'.
alter table public.records drop constraint if exists records_tbl_check;
alter table public.records
  add constraint records_tbl_check
  check (tbl in ('habits','reviews','events','wellbeing','rewards','profile','garmin','garmin_detail'));

drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated
  with check (user_id = auth.uid() and tbl not in ('garmin','garmin_detail'));
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
  using (user_id = auth.uid() and tbl not in ('garmin','garmin_detail'))
  with check (user_id = auth.uid() and tbl not in ('garmin','garmin_detail'));

-- push_records: same body as before, 'garmin' and 'garmin_detail' items are silently ignored.
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
    where x.tbl not in ('garmin','garmin_detail')
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

revoke all on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

-- garmin_upsert_records gains p_tbl; unchanged rows keep their rev (repeated pulls do not re-download them).
create or replace function public.garmin_upsert_records(p_user uuid, p_tbl text, p_rows jsonb, p_schema int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if p_tbl is null or p_tbl not in ('garmin','garmin_detail') then
    raise exception 'p_tbl must be garmin or garmin_detail';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a json array';
  end if;
  -- Same per-user lock as push_records, so rev order = commit order.
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  insert into public.records as r (user_id, tbl, key, data, deleted, schema, client_updated_at, rev)
  select p_user, p_tbl, x.key, x.data, false, p_schema, now(), nextval('public.records_rev_seq')
  from jsonb_to_recordset(p_rows) as x(key text, data jsonb)
  on conflict (user_id, tbl, key) do update
    set data = excluded.data, deleted = false, schema = excluded.schema,
        client_updated_at = excluded.client_updated_at,
        rev = nextval('public.records_rev_seq')
    where r.data is distinct from excluded.data or r.deleted;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.garmin_upsert_records(uuid, text, jsonb, int) from public, anon, authenticated;
grant execute on function public.garmin_upsert_records(uuid, text, jsonb, int) to service_role;

-- NOTE: the deployed garmin-pull (v3) calls the old 3-arg version. Between `db push` and
-- `functions deploy garmin-pull` pulls fail with stage 'db' (harmless: retry after deploy).
drop function if exists public.garmin_upsert_records(uuid, jsonb, int);
