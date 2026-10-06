-- Print orders without an account: a magazine subscription or a single
-- printed issue can be ordered by anyone, like the catalog. Signed-in orders
-- still belong to the account (the triggers set user_id from the session).
-- Guests get the same flood limits as the catalog: three orders an hour per
-- phone number and thirty in ten minutes overall.

drop policy if exists "subs signed-in create" on public.subscription_orders;
create policy "subs anyone create" on public.subscription_orders for insert with check (true);

-- Single issues: guests may order print only (digital copies are bought on /buy)
drop policy if exists "orders signed-in create" on public.orders;
create policy "orders print or signed-in create" on public.orders
  for insert with check (auth.uid() is not null or format = 'print');

create or replace function public.subscription_orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new; -- manual entries from the admin panel keep what the admin typed
  end if;
  if (select count(*) from public.subscription_orders
      where right(regexp_replace(phone, '\D', '', 'g'), 8) = right(regexp_replace(new.phone, '\D', '', 'g'), 8)
        and created_at > public.now_ms() - 60 * 60 * 1000) >= 3 then
    raise exception 'RATE_LIMIT: too many orders for this phone';
  end if;
  if (select count(*) from public.subscription_orders where created_at > public.now_ms() - 10 * 60 * 1000) >= 30 then
    raise exception 'RATE_LIMIT: too many orders right now';
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

create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.magazines;
begin
  if (select count(*) from public.orders
      where right(regexp_replace(phone, '\D', '', 'g'), 8) = right(regexp_replace(new.phone, '\D', '', 'g'), 8)
        and created_at > public.now_ms() - 60 * 60 * 1000) >= 3 then
    raise exception 'RATE_LIMIT: too many orders for this phone';
  end if;
  if (select count(*) from public.orders where created_at > public.now_ms() - 10 * 60 * 1000) >= 30 then
    raise exception 'RATE_LIMIT: too many orders right now';
  end if;
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
