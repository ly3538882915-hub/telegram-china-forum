-- Social: friend requests, private chats and chat images. Run once in Supabase SQL Editor.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(), responded_at timestamptz,
  unique(requester_id,recipient_id), check(requester_id <> recipient_id)
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), direct_key text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key(conversation_id,user_id)
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check(char_length(body)<=2000), media_path text, media_type text,
  created_at timestamptz not null default now(), check(char_length(body)>0 or media_path is not null)
);
create or replace view public.public_profile_cards as select id,username,level,created_at from public.profiles;
grant select on public.public_profile_cards to authenticated;
grant select,insert,update on public.friend_requests to authenticated;
grant select,insert on public.conversations,public.conversation_members,public.chat_messages to authenticated;
alter table public.friend_requests enable row level security; alter table public.conversations enable row level security; alter table public.conversation_members enable row level security; alter table public.chat_messages enable row level security;
create or replace function public.is_conversation_member(conversation uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.conversation_members where conversation_id=conversation and user_id=auth.uid()) $$;
drop policy if exists "friend requests visible" on public.friend_requests; drop policy if exists "friend request create" on public.friend_requests; drop policy if exists "friend request respond" on public.friend_requests;
create policy "friend requests visible" on public.friend_requests for select to authenticated using(requester_id=auth.uid() or recipient_id=auth.uid());
create policy "friend request create" on public.friend_requests for insert to authenticated with check(requester_id=auth.uid() and requester_id<>recipient_id);
create policy "friend request respond" on public.friend_requests for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
drop policy if exists "conversation visible" on public.conversations; drop policy if exists "members visible" on public.conversation_members; drop policy if exists "messages visible" on public.chat_messages; drop policy if exists "messages send" on public.chat_messages;
create policy "conversation visible" on public.conversations for select to authenticated using(public.is_conversation_member(id));
create policy "members visible" on public.conversation_members for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "messages visible" on public.chat_messages for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "messages send" on public.chat_messages for insert to authenticated with check(sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create or replace function public.start_direct_chat(target uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare key text; result uuid;
begin
 if target=auth.uid() then raise exception 'cannot chat with self'; end if;
 if not exists(select 1 from public.friend_requests where status='accepted' and ((requester_id=auth.uid() and recipient_id=target) or (requester_id=target and recipient_id=auth.uid()))) then raise exception 'friendship required'; end if;
 key:=least(auth.uid()::text,target::text)||':'||greatest(auth.uid()::text,target::text);
 select id into result from public.conversations where direct_key=key;
 if result is null then insert into public.conversations(direct_key) values(key) returning id into result; insert into public.conversation_members(conversation_id,user_id) values(result,auth.uid()),(result,target); end if;
 return result;
end $$;
grant execute on function public.start_direct_chat(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-media','chat-media',false,10485760,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
drop policy if exists "chat media read" on storage.objects; drop policy if exists "chat media upload" on storage.objects;
create policy "chat media read" on storage.objects for select to authenticated using(bucket_id='chat-media' and public.is_conversation_member(((storage.foldername(name))[2])::uuid));
create policy "chat media upload" on storage.objects for insert to authenticated with check(bucket_id='chat-media' and (storage.foldername(name))[1]='chat' and public.is_conversation_member(((storage.foldername(name))[2])::uuid));
