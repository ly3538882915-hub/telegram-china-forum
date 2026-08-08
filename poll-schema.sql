-- One-vote community discussion poll. Run once in Supabase SQL Editor.
create table if not exists public.community_polls (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  summary text not null, is_open boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.community_poll_votes (
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check(choice in ('continue','pause')),
  created_at timestamptz not null default now(), primary key(poll_id,user_id)
);
insert into public.community_polls(slug,title,summary) values(
  'public-discussion-2026-08',
  '关于公开争议事件的社区讨论投票',
  '针对近期公开争议与当事人说明，邀请成员在尊重事实、避免人身攻击的前提下表达看法。'
) on conflict(slug) do nothing;
grant select on public.community_polls,public.community_poll_votes to authenticated;
grant insert on public.community_poll_votes to authenticated;
alter table public.community_polls enable row level security; alter table public.community_poll_votes enable row level security;
drop policy if exists "poll visible" on public.community_polls; drop policy if exists "votes visible" on public.community_poll_votes; drop policy if exists "vote once" on public.community_poll_votes;
create policy "poll visible" on public.community_polls for select to authenticated using(true);
create policy "votes visible" on public.community_poll_votes for select to authenticated using(true);
create policy "vote once" on public.community_poll_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.community_polls where id=poll_id and is_open));
