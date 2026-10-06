-- Every SMS our server sends (login codes, phone-change codes), so it can
-- refuse floods: per number a minimum gap, an hourly and a daily cap, plus
-- an overall hourly cap. Only the server (service role) reads or writes it.
create table if not exists public.sms_log (
  id bigint generated always as identity primary key,
  phone text not null,
  kind text not null default 'login' check (kind in ('login', 'phone-change', 'other')),
  sent_at bigint not null default public.now_ms()
);
create index if not exists sms_log_phone_sent on public.sms_log (phone, sent_at desc);
create index if not exists sms_log_sent on public.sms_log (sent_at desc);
alter table public.sms_log enable row level security;
