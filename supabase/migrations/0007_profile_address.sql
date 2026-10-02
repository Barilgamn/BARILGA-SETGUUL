-- A saved delivery address on the profile ({region, district, subdivision,
-- detail, placeType, lat, lng}), used to prefill order forms. New-issue
-- alerts now go by email, so notify_new_issue means "email me".
alter table public.profiles
  add column if not exists address jsonb check (address is null or pg_column_size(address) < 2000);
