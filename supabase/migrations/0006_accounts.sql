-- Account settings: name, contact email and new-issue SMS alerts on the
-- profile; phone changes verified by our own SMS code; a log of the issue
-- alerts admins have sent.

alter table public.profiles
  add column if not exists last_name text not null default '' check (char_length(last_name) <= 60),
  add column if not exists first_name text not null default '' check (char_length(first_name) <= 60),
  add column if not exists email text not null default '' check (char_length(email) <= 120),
  add column if not exists notify_new_issue boolean not null default false,
  add column if not exists updated_at bigint;

-- The phone is the login: only the server (after an SMS check) may change it
create or replace function public.profiles_keep_phone() returns trigger
language plpgsql as $$
begin
  if new.phone is distinct from old.phone and coalesce(auth.role(), '') <> 'service_role' then
    new.phone := old.phone;
  end if;
  new.updated_at := public.now_ms();
  return new;
end $$;
drop trigger if exists profiles_keep_phone on public.profiles;
create trigger profiles_keep_phone before update on public.profiles
  for each row execute function public.profiles_keep_phone();

-- Pending phone changes: a hashed code, its new number and a few tries.
-- No policies, so only the service role (our server) can touch it.
create table if not exists public.phone_changes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  sent_at bigint not null default public.now_ms(),
  expires_at bigint not null
);
alter table public.phone_changes enable row level security;

-- New-issue SMS alerts already sent, so an issue isn't announced twice
create table if not exists public.issue_notifications (
  issue_id text primary key,
  title text not null default '',
  sent_count integer not null default 0,
  sent_at bigint not null default public.now_ms()
);
alter table public.issue_notifications enable row level security;
create policy "issue notifications admin read" on public.issue_notifications for select using (public.is_admin());
