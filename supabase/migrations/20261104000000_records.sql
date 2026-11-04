-- Generic synced records: one row per domain record, JSON payload tagged with client schema version.
create sequence public.records_rev_seq;

create table public.records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tbl text not null check (tbl in ('habits','reviews','events','wellbeing','rewards')),
  key text not null,
  data jsonb,
  deleted boolean not null default false,
  schema int not null,
  client_updated_at timestamptz not null,
  rev bigint not null default nextval('public.records_rev_seq'),
  primary key (user_id, tbl, key)
);

create index records_user_rev_idx on public.records (user_id, rev);

alter table public.records enable row level security;

revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;
grant usage on sequence public.records_rev_seq to authenticated;

create policy records_select on public.records for select to authenticated
  using (user_id = auth.uid());
create policy records_insert on public.records for insert to authenticated
  with check (user_id = auth.uid());
create policy records_update on public.records for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy records_delete on public.records for delete to authenticated
  using (user_id = auth.uid());

-- Pushes are serialized per user so rev order equals commit order (safe pull cursor).
-- Last edit wins on client_updated_at; every accepted write takes a new rev.
create function public.push_records(items jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare
  accepted int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  -- client_updated_at must be an ISO timestamp string; duplicates in one batch keep the latest.
  with incoming as (
    select distinct on (x.tbl, x.key) * from jsonb_to_recordset(items) as x(
      tbl text, key text, data jsonb, deleted boolean, schema int, client_updated_at timestamptz
    )
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

create function public.reset_records() returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  delete from public.records where user_id = auth.uid();
end $$;

revoke all on function public.push_records(jsonb) from public, anon;
revoke all on function public.reset_records() from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;
grant execute on function public.reset_records() to authenticated;
