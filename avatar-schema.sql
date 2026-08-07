-- LV5 avatar feature. Run once in Supabase SQL Editor.
alter table public.profiles add column if not exists avatar_path text;
create or replace function public.can_set_avatar() returns boolean language sql stable security definer set search_path=public as $$ select public.current_level()>=5 or public.can_moderate() $$;
create or replace function public.set_avatar(new_path text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_set_avatar() then raise exception 'LV5 required'; end if;
  if new_path !~ ('^' || auth.uid()::text || '/') then raise exception 'invalid avatar path'; end if;
  update public.profiles set avatar_path=new_path where id=auth.uid();
end $$;
grant execute on function public.set_avatar(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
drop policy if exists "avatar upload" on storage.objects; drop policy if exists "avatar delete" on storage.objects;
create policy "avatar upload" on storage.objects for insert to authenticated with check(bucket_id='avatars' and public.can_set_avatar() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar delete" on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
