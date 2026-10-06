-- Renewal reminders for subscriptions: one row per subscription and stage
-- (14 days left, 3 days left, ended), so each reminder goes out once.
-- Written by the server; admins read.
create table if not exists public.subscription_reminders (
  subscription_id uuid not null references public.subscription_orders (id) on delete cascade,
  stage text not null check (stage in ('soon', 'last', 'ended')),
  sent_at bigint not null default public.now_ms(),
  sms boolean not null default false,
  email boolean not null default false,
  primary key (subscription_id, stage)
);
alter table public.subscription_reminders enable row level security;
create policy "subscription reminders admin read" on public.subscription_reminders for select using (public.is_admin());
