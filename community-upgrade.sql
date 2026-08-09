-- 社区大版本 1-10：在 Supabase SQL Editor 完整运行一次。
alter table public.profiles add column if not exists bio text not null default '' check(char_length(bio)<=180);
alter table public.profiles add column if not exists profile_theme text not null default 'ocean' check(profile_theme in ('ocean','midnight','paper'));
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verification_label text;
alter table public.posts add column if not exists category text not null default '综合交流';
alter table public.posts add column if not exists is_pinned boolean not null default false;
create or replace view public.public_profile_cards as select id,username,level,created_at,is_verified,verification_label,bio from public.profiles;

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null, title text not null, body text not null default '', href text, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create table if not exists public.user_badges (
 user_id uuid not null references public.profiles(id) on delete cascade, badge_key text not null,
 title text not null, description text not null default '', awarded_at timestamptz not null default now(), primary key(user_id,badge_key)
);
create table if not exists public.content_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
 target_type text not null check(target_type in ('post','comment','message')),
 target_id uuid not null, reason text not null check(char_length(reason) between 2 and 500),
 status text not null default 'pending' check(status in ('pending','resolved','dismissed')),
 handler_id uuid references public.profiles(id), handler_note text not null default '', created_at timestamptz not null default now(), handled_at timestamptz
);
create table if not exists public.moderation_actions (
 id uuid primary key default gen_random_uuid(), moderator_id uuid not null references public.profiles(id), target_user_id uuid references public.profiles(id),
 action text not null, detail text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.user_restrictions (
 user_id uuid primary key references public.profiles(id) on delete cascade, muted_until timestamptz, banned_at timestamptz, reason text not null default '', updated_at timestamptz not null default now()
);

create or replace function public.is_restricted() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_restrictions where user_id=auth.uid() and (banned_at is not null or muted_until>now()))
$$;
create or replace function public.notify_user(target uuid, notice_kind text, notice_title text, notice_body text default '', notice_href text default null) returns void language plpgsql security definer set search_path=public as $$
begin if target is not null and target<>auth.uid() then insert into public.notifications(user_id,kind,title,body,href) values(target,notice_kind,notice_title,notice_body,notice_href); end if; end $$;
create or replace function public.notify_post_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; begin select author_id into owner_id from public.posts where id=new.post_id; perform public.notify_user(owner_id,'comment','你的帖子收到了新评论',new.author_name,concat('post.html?id=',new.post_id)); return new; end $$;
drop trigger if exists notify_post_comment_trigger on public.comments; create trigger notify_post_comment_trigger after insert on public.comments for each row execute function public.notify_post_comment();
create or replace function public.notify_friend_request() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.notify_user(new.recipient_id,'friend_request','收到新的好友申请','前往好友与消息页面处理','contacts.html'); return new; end $$;
drop trigger if exists notify_friend_request_trigger on public.friend_requests; create trigger notify_friend_request_trigger after insert on public.friend_requests for each row execute function public.notify_friend_request();
create or replace function public.notify_chat_message() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.notifications(user_id,kind,title,body,href) select user_id,'message','收到一条新消息',left(new.body,80),concat('chat.html?with=',new.sender_id) from public.conversation_members where conversation_id=new.conversation_id and user_id<>new.sender_id; return new; end $$;
drop trigger if exists notify_chat_message_trigger on public.chat_messages; create trigger notify_chat_message_trigger after insert on public.chat_messages for each row execute function public.notify_chat_message();

alter table public.notifications enable row level security; alter table public.user_badges enable row level security; alter table public.content_reports enable row level security; alter table public.moderation_actions enable row level security; alter table public.user_restrictions enable row level security;
grant select,update on public.notifications to authenticated; grant select on public.user_badges to authenticated; grant insert,select on public.content_reports to authenticated;
grant select,insert,update,delete on public.notifications,public.user_badges,public.content_reports,public.moderation_actions,public.user_restrictions to service_role;
drop policy if exists "own notifications" on public.notifications; create policy "own notifications" on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "mark own notifications" on public.notifications; create policy "mark own notifications" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "badges visible" on public.user_badges; create policy "badges visible" on public.user_badges for select to authenticated using(true);
drop policy if exists "create reports" on public.content_reports; create policy "create reports" on public.content_reports for insert to authenticated with check(reporter_id=auth.uid() and reporter_id<>(select author_id from public.posts where id=target_id));
drop policy if exists "own reports" on public.content_reports; create policy "own reports" on public.content_reports for select to authenticated using(reporter_id=auth.uid());

drop policy if exists "post insert" on public.posts;
create policy "post insert" on public.posts for insert to authenticated with check(author_id=auth.uid() and not public.is_restricted() and public.can_publish_post() and public.can_create_post(body) and (not official or public.can_moderate()));
drop policy if exists "comment insert" on public.comments;
create policy "comment insert" on public.comments for insert to authenticated with check(author_id=auth.uid() and not public.is_restricted() and public.can_publish_post() and exists(select 1 from public.posts where id=post_id and comment_enabled));
drop policy if exists "messages send" on public.chat_messages;
create policy "messages send" on public.chat_messages for insert to authenticated with check(sender_id=auth.uid() and not public.is_restricted() and public.is_conversation_member(conversation_id));

insert into public.user_badges(user_id,badge_key,title,description) select id,'early-member','社区成员','已加入电报中国区论坛' from public.profiles on conflict do nothing;

alter table public.chat_messages add column if not exists read_at timestamptz;
alter table public.chat_messages add column if not exists retracted_at timestamptz;
alter table public.chat_messages add column if not exists reply_to uuid references public.chat_messages(id) on delete set null;
grant update on public.chat_messages to authenticated;
drop policy if exists "messages mark read or retract" on public.chat_messages;
create policy "messages mark read or retract" on public.chat_messages for update to authenticated using(public.is_conversation_member(conversation_id)) with check(public.is_conversation_member(conversation_id));
