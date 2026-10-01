-- Hand-added magazines become sellable like Heyzine issues: a digital price
-- above zero makes the issue paid.
--
-- Their rows hold the flipbook link, so the public can no longer read the
-- table directly; the site reads it through /api/magazines, which strips the
-- link and PDF from paid issues. Admins still read and write it as before.

drop policy if exists "magazines public read" on public.magazines;

-- Purchases take their price from issue_prices (Heyzine issues) or, for a
-- hand-added magazine, from its digital price
create or replace function public.purchases_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare p integer;
begin
  select price into p from public.issue_prices where issue_id = new.issue_id;
  if p is null then
    select nullif(price_digital, 0) into p from public.magazines where id::text = new.issue_id;
  end if;
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
