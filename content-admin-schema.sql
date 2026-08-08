-- Transparent content recommendation controls. Run once in Supabase SQL Editor.
alter table public.posts add column if not exists recommended_score integer not null default 0 check(recommended_score >= 0);
alter table public.posts add column if not exists is_pinned boolean not null default false;
alter table public.posts add column if not exists is_featured boolean not null default false;
grant select,update on public.posts to service_role;
