-- Abuse limits found in the security review.
--
-- 1. Anyone may place a catalog order without signing in, so cap it: three
--    orders an hour per phone number and thirty in ten minutes overall.
-- 2. Reader opens are counted once per viewer and issue every 30 minutes;
--    `viewer` is the account id or a hash of the visitor's network address.

create or replace function public.catalog_orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg jsonb;
begin
  if (select count(*) from public.catalog_orders
      where phone = new.phone and created_at > public.now_ms() - 60 * 60 * 1000) >= 3 then
    raise exception 'RATE_LIMIT: too many orders for this phone';
  end if;
  if (select count(*) from public.catalog_orders
      where created_at > public.now_ms() - 10 * 60 * 1000) >= 30 then
    raise exception 'RATE_LIMIT: too many orders right now';
  end if;

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

alter table public.issue_views add column if not exists viewer text not null default '';
create index if not exists issue_views_viewer on public.issue_views (issue_id, viewer, viewed_at desc);
