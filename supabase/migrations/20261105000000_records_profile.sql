-- Profile (single row, key 'me') is now synced: allow tbl = 'profile'.
alter table public.records drop constraint if exists records_tbl_check;
alter table public.records
  add constraint records_tbl_check
  check (tbl in ('habits','reviews','events','wellbeing','rewards','profile'));
