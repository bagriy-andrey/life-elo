-- reset_records now tombstones instead of hard-deleting, so the user's other devices
-- pull the deletions (they only see rows with rev > their cursor) and wipe their local data.
-- client_updated_at is deliberately left unchanged: setting it to the server's now() would
-- make a device with a lagging clock lose last-write-wins when it re-uploads right after the
-- reset (keepDevice). With the old timestamp, any later edit wins and any older one loses, as before.
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
end $$;

revoke all on function public.reset_records() from public, anon;
grant execute on function public.reset_records() to authenticated;
