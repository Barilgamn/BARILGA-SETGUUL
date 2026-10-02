-- Structured delivery addresses: khoroo (Ulaanbaatar), home or office, and
-- an optional map pin. city is «Улаанбаатар» or the aimag; district is the
-- UB district or the sum. Single-issue orders keep theirs in shipping_address.

alter table public.subscription_orders
  add column if not exists khoroo text not null default '' check (char_length(khoroo) <= 10),
  add column if not exists place_type text not null default 'home' check (place_type in ('home', 'office')),
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

alter table public.catalog_orders
  add column if not exists city text not null default '' check (char_length(city) <= 50),
  add column if not exists khoroo text not null default '' check (char_length(khoroo) <= 10),
  add column if not exists place_type text not null default 'home' check (place_type in ('home', 'office')),
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180);

-- The public order lookup shows the whole address, so it returns the new
-- columns too (a changed return type needs a drop)
drop function if exists public.get_catalog_order(text);
create function public.get_catalog_order(p_code text)
returns table (
  code text, product_title text, quantity integer, unit_price integer, delivery_fee integer,
  delivery_method text, city text, district text, khoroo text, address text, place_type text,
  status text, payment_status text, created_at bigint, updated_at bigint
)
language sql stable security definer set search_path = public as $$
  select code, product_title, quantity, unit_price, delivery_fee, delivery_method, city, district, khoroo,
         address, place_type, status, payment_status, created_at, updated_at
  from public.catalog_orders where code = upper(p_code);
$$;
grant execute on function public.get_catalog_order(text) to anon, authenticated;
