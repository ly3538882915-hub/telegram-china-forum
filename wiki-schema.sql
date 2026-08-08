-- 电报中国百科：请在 Supabase 的 SQL Editor 完整运行一次。
create table if not exists public.wiki_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 2 and 80),
  summary text not null default '' check (char_length(summary) <= 280),
  content text not null default '' check (char_length(content) <= 30000),
  category text not null default '综合',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.wiki_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.wiki_entries(id) on delete cascade,
  entry_slug text not null check (entry_slug ~ '^[a-z0-9-]{3,80}$'),
  proposed_title text not null check (char_length(proposed_title) between 2 and 80),
  proposed_summary text not null default '' check (char_length(proposed_summary) <= 280),
  proposed_content text not null check (char_length(proposed_content) between 1 and 30000),
  proposed_category text not null default '综合',
  edit_note text not null default '' check (char_length(edit_note) <= 500),
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists wiki_entries_updated_idx on public.wiki_entries(updated_at desc);
create index if not exists wiki_revisions_pending_idx on public.wiki_revisions(status,created_at);

alter table public.wiki_entries enable row level security;
alter table public.wiki_revisions enable row level security;
grant select on public.wiki_entries to authenticated;
grant select,insert on public.wiki_revisions to authenticated;
grant select,insert,update,delete on public.wiki_entries,public.wiki_revisions to service_role;

drop policy if exists "wiki published entries" on public.wiki_entries;
create policy "wiki published entries" on public.wiki_entries for select to authenticated using (true);
drop policy if exists "wiki submit revision" on public.wiki_revisions;
create policy "wiki submit revision" on public.wiki_revisions for insert to authenticated with check (
  author_id = auth.uid() and status = 'pending' and reviewer_id is null and reviewed_at is null
);
drop policy if exists "wiki own revision history" on public.wiki_revisions;
create policy "wiki own revision history" on public.wiki_revisions for select to authenticated using (author_id = auth.uid());

-- 审核完成前不写入 wiki_entries。以下是一个可选的首条词条示例：
-- insert into public.wiki_entries(slug,title,summary,content,category) values
-- ('telegram-china-forum','电报科技（中国）百科','电报中国百科的使用说明。','本百科收录经审核后公开的词条。任何登录用户均可提交新增或修改建议，审核通过后才会展示给所有用户。','平台说明');
