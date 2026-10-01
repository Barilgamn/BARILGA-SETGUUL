-- Барилга.МН сэтгүүл — Supabase schema.
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- Principles:
--   * Timestamps are epoch milliseconds (bigint) to match the app's number fields.
--   * Anything that decides money or access (prices, statuses, who owns a row)
--     is set by triggers or the server, never trusted from the browser.
--   * Admins are rows in public.admins, matched on a *confirmed* email.


create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from now()) * 1000)::bigint $$;

-- ---------------------------------------------------------------- admins
create table public.admins (
  email text primary key check (email = lower(email))
);
insert into public.admins (email) values ('info@barilga.mn'), ('admin@barilga.mn');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

alter table public.admins enable row level security;
create policy "admins read own list" on public.admins for select using (public.is_admin());

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null default '',
  created_at bigint not null default public.now_ms()
);
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- settings
-- key 'house_catalog' → {"price": 25000}; key 'bank' → {"bankName", "accountNumber", "accountName"}
create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at bigint not null default public.now_ms()
);
alter table public.settings enable row level security;
create policy "settings public read" on public.settings for select using (true);
create policy "settings admin write" on public.settings for all using (public.is_admin()) with check (public.is_admin());
-- The office's order account; editable later from the admin panel
insert into public.settings (key, value)
values ('bank', '{"bankName": "Хаан банк", "accountNumber": "5175009575", "accountName": "БЗМТөв"}'::jsonb);

-- ---------------------------------------------------------------- magazines (added by hand in admin)
create table public.magazines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issue_number text not null default '',
  category text not null default 'magazine',
  description text not null default '',
  cover_image text not null default '',
  pdf_url text not null default '',
  heyzine_link text not null default '',
  price_digital integer not null default 0 check (price_digital >= 0),
  price_print integer not null default 0 check (price_print >= 0),
  published_date bigint,
  created_at bigint not null default public.now_ms()
);
alter table public.magazines enable row level security;
create policy "magazines public read" on public.magazines for select using (true);
create policy "magazines admin write" on public.magazines for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- issue_prices (paid Heyzine issues)
create table public.issue_prices (
  issue_id text primary key,
  price integer not null check (price > 0),
  title text not null default '',
  updated_at bigint not null default public.now_ms()
);
alter table public.issue_prices enable row level security;
create policy "issue_prices public read" on public.issue_prices for select using (true);
create policy "issue_prices admin write" on public.issue_prices for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- subscription_orders (Багц захиалга)
create table public.subscription_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  plan text not null check (plan in ('quarterly', 'half-year', 'yearly')),
  price integer not null default 0,
  full_name text not null,
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  district text not null default '',
  address_detail text not null default '',
  ebarimt_type text not null default 'personal' check (ebarimt_type in ('personal', 'company')),
  company_name text not null default '',
  register_number text not null default '',
  payment_method text not null default 'invoice',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'delivering', 'delivered')),
  digital_code text not null default '',
  start_date bigint,
  end_date bigint,
  created_at bigint not null default public.now_ms()
);

-- Plan prices live here, not in the browser
create or replace function public.subscription_orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new; -- manual entries from the admin panel keep what the admin typed
  end if;
  new.user_id := auth.uid();
  new.price := case new.plan when 'quarterly' then 41000 when 'half-year' then 76000 when 'yearly' then 149000 end;
  new.payment_status := 'pending';
  new.delivery_status := 'pending';
  new.digital_code := '';
  new.created_at := public.now_ms();
  new.start_date := null;
  new.end_date := null;
  return new;
end $$;
create trigger subscription_orders_before_insert before insert on public.subscription_orders
  for each row execute function public.subscription_orders_before_insert();

alter table public.subscription_orders enable row level security;
create policy "subs own read" on public.subscription_orders for select using (user_id = auth.uid() or public.is_admin());
create policy "subs signed-in create" on public.subscription_orders for insert with check (auth.uid() is not null);
create policy "subs admin update" on public.subscription_orders for update using (public.is_admin()) with check (public.is_admin());
create policy "subs admin delete" on public.subscription_orders for delete using (public.is_admin());

-- ---------------------------------------------------------------- orders (single print/digital issue from /checkout)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  magazine_id uuid not null references public.magazines (id) on delete restrict,
  magazine_title text not null default '',
  format text not null check (format in ('digital', 'print', 'both')),
  total_price integer not null default 0,
  phone text not null default '',
  shipping_address jsonb,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at bigint not null default public.now_ms()
);

create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.magazines;
begin
  select * into m from public.magazines where id = new.magazine_id;
  if not found then raise exception 'magazine not found'; end if;
  new.user_id := auth.uid();
  new.magazine_title := m.title;
  new.total_price := case new.format
    when 'digital' then m.price_digital
    when 'print' then m.price_print
    else m.price_digital + m.price_print end;
  new.payment_status := 'pending';
  new.delivery_status := 'pending';
  new.created_at := public.now_ms();
  return new;
end $$;
create trigger orders_before_insert before insert on public.orders
  for each row execute function public.orders_before_insert();

alter table public.orders enable row level security;
create policy "orders own read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders signed-in create" on public.orders for insert with check (auth.uid() is not null);
create policy "orders admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "orders admin delete" on public.orders for delete using (public.is_admin());

-- ---------------------------------------------------------------- catalog_orders («Амины орон сууц» каталог)
-- The code is the customer's tracking secret: they can look up one order by
-- code (get_catalog_order) but cannot list the table.
create table public.catalog_orders (
  code text primary key check (code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  product_id text not null default '',
  product_title text not null default '',
  quantity integer not null check (quantity between 1 and 50),
  unit_price integer,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  delivery_method text not null check (delivery_method in ('delivery', 'pickup')),
  district text not null default '' check (char_length(district) <= 50),
  address text not null default '' check (char_length(address) <= 300),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'new' check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  admin_note text not null default '',
  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

create or replace function public.catalog_orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.unit_price := (select (value ->> 'price')::integer from public.settings where key = 'house_catalog');
  new.status := 'new';
  new.payment_status := 'unpaid';
  new.admin_note := '';
  new.created_at := public.now_ms();
  new.updated_at := new.created_at;
  return new;
end $$;
create trigger catalog_orders_before_insert before insert on public.catalog_orders
  for each row execute function public.catalog_orders_before_insert();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := public.now_ms(); return new; end $$;
create trigger catalog_orders_touch before update on public.catalog_orders
  for each row execute function public.touch_updated_at();

alter table public.catalog_orders enable row level security;
create policy "catalog anyone create" on public.catalog_orders for insert with check (true);
create policy "catalog admin read" on public.catalog_orders for select using (public.is_admin());
create policy "catalog admin update" on public.catalog_orders for update using (public.is_admin()) with check (public.is_admin());
create policy "catalog admin delete" on public.catalog_orders for delete using (public.is_admin());

-- Public lookup by code; admin_note stays private
create or replace function public.get_catalog_order(p_code text)
returns table (
  code text, product_title text, quantity integer, unit_price integer, delivery_method text,
  district text, address text, status text, payment_status text, created_at bigint, updated_at bigint
)
language sql stable security definer set search_path = public as $$
  select code, product_title, quantity, unit_price, delivery_method, district, address,
         status, payment_status, created_at, updated_at
  from public.catalog_orders where code = upper(p_code);
$$;
grant execute on function public.get_catalog_order(text) to anon, authenticated;

-- ---------------------------------------------------------------- purchases (paid digital issues)
create table public.purchases (
  id text primary key check (id ~ '^[A-HJKMNP-Z2-9]{8}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null default '',
  issue_id text not null,
  issue_title text not null default '',
  cover_image text not null default '',
  amount integer not null,
  method text not null check (method in ('qpay', 'transfer')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at bigint not null default public.now_ms(),
  paid_at bigint,
  paid_via text check (paid_via in ('qpay', 'admin')),
  paid_amount integer,
  qpay jsonb
);
create index purchases_user_issue on public.purchases (user_id, issue_id, status);

create or replace function public.purchases_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare p integer;
begin
  select price into p from public.issue_prices where issue_id = new.issue_id;
  if p is null then raise exception 'issue is not for sale'; end if;
  new.user_id := auth.uid();
  new.amount := p;
  new.status := 'pending';
  new.paid_at := null;
  new.paid_via := null;
  new.paid_amount := null;
  new.qpay := null;
  new.created_at := public.now_ms();
  return new;
end $$;
create trigger purchases_before_insert before insert on public.purchases
  for each row execute function public.purchases_before_insert();

alter table public.purchases enable row level security;
create policy "purchases own read" on public.purchases for select using (user_id = auth.uid() or public.is_admin());
create policy "purchases signed-in create" on public.purchases for insert with check (auth.uid() is not null);
create policy "purchases admin update" on public.purchases for update using (public.is_admin()) with check (public.is_admin());
create policy "purchases admin delete" on public.purchases for delete using (public.is_admin());

-- Buyers may only switch the payment method of their own pending purchase
create or replace function public.set_purchase_method(p_id text, p_method text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_method not in ('qpay', 'transfer') then raise exception 'bad method'; end if;
  update public.purchases set method = p_method
  where id = p_id and user_id = auth.uid() and status = 'pending';
end $$;
grant execute on function public.set_purchase_method(text, text) to authenticated;

-- ---------------------------------------------------------------- realtime (admin lists, buy page)
alter publication supabase_realtime add table public.catalog_orders, public.purchases;
