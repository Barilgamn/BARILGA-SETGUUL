-- «Амины орон сууц» catalog: price 55,000₮ and a 7,000₮ delivery fee.
-- The fee is stored on each order (like unit_price) so a later change to the
-- fee doesn't rewrite what earlier customers were invoiced.

alter table public.catalog_orders
  add column if not exists delivery_fee integer not null default 0 check (delivery_fee >= 0);

create or replace function public.catalog_orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg jsonb;
begin
  select value into cfg from public.settings where key = 'house_catalog';
  new.unit_price := (cfg ->> 'price')::integer;
  new.delivery_fee := case
    when new.delivery_method = 'delivery' then coalesce((cfg ->> 'deliveryFee')::integer, 0)
    else 0 end;
  new.status := 'new';
  new.payment_status := 'unpaid';
  new.admin_note := '';
  new.created_at := public.now_ms();
  new.updated_at := new.created_at;
  return new;
end $$;

-- The public lookup gains delivery_fee; a changed return type needs a drop
drop function if exists public.get_catalog_order(text);
create function public.get_catalog_order(p_code text)
returns table (
  code text, product_title text, quantity integer, unit_price integer, delivery_fee integer,
  delivery_method text, district text, address text, status text, payment_status text,
  created_at bigint, updated_at bigint
)
language sql stable security definer set search_path = public as $$
  select code, product_title, quantity, unit_price, delivery_fee, delivery_method, district, address,
         status, payment_status, created_at, updated_at
  from public.catalog_orders where code = upper(p_code);
$$;
grant execute on function public.get_catalog_order(text) to anon, authenticated;

insert into public.settings (key, value)
values ('house_catalog', '{"price": 55000, "deliveryFee": 7000}'::jsonb)
on conflict (key) do update set value = public.settings.value || excluded.value, updated_at = public.now_ms();
