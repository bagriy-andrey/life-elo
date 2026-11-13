-- Garmin records upsert via RPC (direct Postgres from Edge Functions was unreachable in prod).
create or replace function public.garmin_upsert_records(p_user uuid, p_rows jsonb, p_schema int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a json array';
  end if;
  -- Same per-user lock as push_records, so rev order = commit order.
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  insert into public.records as r (user_id, tbl, key, data, deleted, schema, client_updated_at, rev)
  select p_user, 'garmin', x.key, x.data, false, p_schema, now(), nextval('public.records_rev_seq')
  from jsonb_to_recordset(p_rows) as x(key text, data jsonb)
  on conflict (user_id, tbl, key) do update
    set data = excluded.data, deleted = false, schema = excluded.schema,
        client_updated_at = excluded.client_updated_at,
        rev = nextval('public.records_rev_seq');
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.garmin_upsert_records(uuid, jsonb, int) from public, anon, authenticated;
grant execute on function public.garmin_upsert_records(uuid, jsonb, int) to service_role;
