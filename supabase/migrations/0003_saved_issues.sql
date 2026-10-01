-- «Хадгалах»: readers bookmark issues into «Миний хэвлэлүүд».
-- Title and cover are copied at save time so the list renders without
-- re-fetching the Heyzine catalogue.

create table if not exists public.saved_issues (
  user_id uuid not null references auth.users (id) on delete cascade,
  issue_id text not null check (char_length(issue_id) <= 100),
  title text not null default '' check (char_length(title) <= 300),
  cover_image text not null default '' check (char_length(cover_image) <= 500),
  saved_at bigint not null default public.now_ms(),
  primary key (user_id, issue_id)
);

alter table public.saved_issues enable row level security;
create policy "saved own read" on public.saved_issues for select using (user_id = auth.uid());
create policy "saved own insert" on public.saved_issues for insert with check (user_id = auth.uid());
create policy "saved own delete" on public.saved_issues for delete using (user_id = auth.uid());
