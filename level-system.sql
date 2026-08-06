-- Level, discussion and interaction upgrade. Run once in Supabase SQL Editor.
alter table public.profiles add column if not exists level integer not null default 0 check(level between 0 and 120);
alter table public.profiles add column if not exists xp integer not null default 0 check(xp >= 0);
alter table public.posts add column if not exists author_name text;
alter table public.posts add column if not exists comment_enabled boolean not null default true;
alter table public.posts add column if not exists show_timestamp boolean not null default true;
update public.posts p set author_name = coalesce(p.author_name, pr.username, '社区成员') from public.profiles pr where pr.id=p.author_id;
alter table public.posts alter column author_name set not null;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade, author_name text not null,
  body text not null check(char_length(body) between 1 and 500), created_at timestamptz not null default now()
);
create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('like','favorite','share')),
  created_at timestamptz not null default now(), primary key(post_id,user_id,kind)
);
create table if not exists public.user_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot timestamptz not null, primary key(user_id,slot)
);

create or replace function public.current_level() returns integer language sql stable security definer set search_path=public as $$
  select coalesce((select level from public.profiles where id=auth.uid()),0)
$$;
create or replace function public.can_publish_post() returns boolean language sql stable security definer set search_path=public as $$
  select public.can_moderate() or public.current_level() >= 1
$$;
create or replace function public.can_upload_media() returns boolean language sql stable security definer set search_path=public as $$
  select public.can_moderate() or public.current_level() >= 5
$$;
create or replace function public.can_create_post(body_text text) returns boolean language plpgsql stable security definer set search_path=public as $$
begin
  if public.can_moderate() then return true; end if;
  if public.current_level() < 1 then return false; end if;
  if public.current_level() < 5 and char_length(body_text) > 30 then return false; end if;
  if public.current_level() < 5 and (select count(*) from public.posts where author_id=auth.uid()) >= 5 then return false; end if;
  return true;
end $$;
create or replace function public.fill_post_author() returns trigger language plpgsql security definer set search_path=public as $$
begin new.author_name := coalesce((select username from public.profiles where id=new.author_id),'社区成员'); return new; end $$;
drop trigger if exists fill_post_author_trigger on public.posts;
create trigger fill_post_author_trigger before insert on public.posts for each row execute function public.fill_post_author();
create or replace function public.fill_comment_author() returns trigger language plpgsql security definer set search_path=public as $$
begin new.author_name := coalesce((select username from public.profiles where id=new.author_id),'社区成员'); return new; end $$;
drop trigger if exists fill_comment_author_trigger on public.comments;
create trigger fill_comment_author_trigger before insert on public.comments for each row execute function public.fill_comment_author();

create or replace function public.award_xp(target uuid, amount integer) returns void language plpgsql security definer set search_path=public as $$
declare current_level integer; current_xp integer; needed integer;
begin
  if amount <= 0 then return; end if;
  select level,xp into current_level,current_xp from public.profiles where id=target for update;
  if not found then return; end if;
  current_xp := current_xp + amount;
  while current_level < 120 loop
    needed := 20 + current_level * 10;
    exit when current_xp < needed;
    current_xp := current_xp - needed; current_level := current_level + 1;
  end loop;
  update public.profiles set level=current_level,xp=current_xp where id=target;
end $$;
create or replace function public.xp_for_post() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.award_xp(new.author_id,5); return new; end $$;
create or replace function public.xp_for_comment() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.award_xp(new.author_id,2); return new; end $$;
create or replace function public.xp_for_reaction() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.award_xp(new.user_id,1); return new; end $$;
drop trigger if exists xp_for_post_trigger on public.posts; create trigger xp_for_post_trigger after insert on public.posts for each row execute function public.xp_for_post();
drop trigger if exists xp_for_comment_trigger on public.comments; create trigger xp_for_comment_trigger after insert on public.comments for each row execute function public.xp_for_comment();
drop trigger if exists xp_for_reaction_trigger on public.post_reactions; create trigger xp_for_reaction_trigger after insert on public.post_reactions for each row execute function public.xp_for_reaction();
create or replace function public.enforce_superadmin_level() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.role='superadmin' and new.level<60 then new.level:=60; end if; return new; end $$;
drop trigger if exists enforce_superadmin_level_trigger on public.profiles;
create trigger enforce_superadmin_level_trigger before insert or update on public.profiles for each row execute function public.enforce_superadmin_level();

alter table public.comments enable row level security; alter table public.post_reactions enable row level security; alter table public.user_activity enable row level security;
grant select,insert,delete on public.comments,public.post_reactions to authenticated;
grant select,insert on public.user_activity to service_role;
grant select,insert,update,delete on public.comments,public.post_reactions,public.user_activity to service_role;
grant execute on function public.award_xp(uuid,integer) to service_role;
drop policy if exists "posts visible" on public.posts; drop policy if exists "post insert" on public.posts; drop policy if exists "post delete" on public.posts; drop policy if exists "post update" on public.posts;
create policy "posts visible" on public.posts for select to authenticated using(true);
create policy "post insert" on public.posts for insert to authenticated with check(author_id=auth.uid() and public.can_publish_post() and public.can_create_post(body) and (not official or public.can_moderate()));
create policy "post delete" on public.posts for delete to authenticated using(author_id=auth.uid() or public.can_moderate());
create policy "post update" on public.posts for update to authenticated using(author_id=auth.uid() or public.can_moderate()) with check(author_id=auth.uid() or public.can_moderate());
drop policy if exists "media insert" on public.post_media; create policy "media insert" on public.post_media for insert to authenticated with check(public.can_upload_media() and exists(select 1 from public.posts where id=post_id and author_id=auth.uid()));
drop policy if exists "comments visible" on public.comments; drop policy if exists "comment insert" on public.comments; drop policy if exists "comment delete" on public.comments;
create policy "comments visible" on public.comments for select to authenticated using(true);
create policy "comment insert" on public.comments for insert to authenticated with check(author_id=auth.uid() and public.can_publish_post() and exists(select 1 from public.posts where id=post_id and comment_enabled));
create policy "comment delete" on public.comments for delete to authenticated using(author_id=auth.uid() or public.can_moderate());
drop policy if exists "reactions visible" on public.post_reactions; drop policy if exists "reaction insert" on public.post_reactions; drop policy if exists "reaction delete" on public.post_reactions;
create policy "reactions visible" on public.post_reactions for select to authenticated using(true);
create policy "reaction insert" on public.post_reactions for insert to authenticated with check(user_id=auth.uid());
create policy "reaction delete" on public.post_reactions for delete to authenticated using(user_id=auth.uid());
