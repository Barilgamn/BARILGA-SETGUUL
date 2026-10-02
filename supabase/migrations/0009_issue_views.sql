-- Reader opens, for the admin overview («Тойм»): one row each time an issue
-- is opened in the reader. Written by our server only; admins read.
create table if not exists public.issue_views (
  id bigint generated always as identity primary key,
  issue_id text not null check (char_length(issue_id) <= 100),
  title text not null default '' check (char_length(title) <= 300),
  user_id uuid references auth.users (id) on delete set null,
  viewed_at bigint not null default public.now_ms()
);
create index if not exists issue_views_viewed_at on public.issue_views (viewed_at desc);
alter table public.issue_views enable row level security;
create policy "issue views admin read" on public.issue_views for select using (public.is_admin());
