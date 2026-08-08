-- Poll administration with transparent manual adjustments. Run once in Supabase SQL Editor.
create table if not exists public.community_poll_adjustments (
  poll_id uuid primary key references public.community_polls(id) on delete cascade,
  continue_adjustment integer not null default 0,
  pause_adjustment integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.community_poll_adjustments(poll_id)
select id from public.community_polls on conflict(poll_id) do nothing;
grant select on public.community_poll_adjustments to authenticated;
grant select,insert,update on public.community_poll_adjustments to service_role;
alter table public.community_poll_adjustments enable row level security;
drop policy if exists "poll adjustment visible" on public.community_poll_adjustments;
create policy "poll adjustment visible" on public.community_poll_adjustments for select to authenticated using(true);
