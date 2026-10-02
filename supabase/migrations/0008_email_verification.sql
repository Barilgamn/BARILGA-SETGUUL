-- Verified contact emails: new-issue alerts only go to addresses whose owner
-- clicked the link we sent. Only the server (service role) can mark an
-- address verified; changing the address clears it.

alter table public.profiles
  add column if not exists email_verified boolean not null default false;

create or replace function public.profiles_keep_phone() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    -- The phone is the login: only the server changes it, after an SMS check
    if new.phone is distinct from old.phone then
      new.phone := old.phone;
    end if;
    -- A new address needs a new check; otherwise keep what the server set
    if new.email is distinct from old.email then
      new.email_verified := false;
    else
      new.email_verified := old.email_verified;
    end if;
  end if;
  new.updated_at := public.now_ms();
  return new;
end $$;

create or replace function public.profiles_before_insert() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.email_verified := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_before_insert on public.profiles;
create trigger profiles_before_insert before insert on public.profiles
  for each row execute function public.profiles_before_insert();

-- Pending links: a hash of the token, the address it was sent to, 24 hours.
-- No policies, so only the server reads it.
create table if not exists public.email_verifications (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  created_at bigint not null default public.now_ms(),
  expires_at bigint not null
);
create index if not exists email_verifications_user on public.email_verifications (user_id);
alter table public.email_verifications enable row level security;
