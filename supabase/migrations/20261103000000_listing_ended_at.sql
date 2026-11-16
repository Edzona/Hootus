-- When a listing stopped being active (sold or closed). Set by a trigger so
-- clients cannot backdate it; used for the profile's completed-sales history.
alter table public.listings add column ended_at timestamptz;

-- Existing ended listings: no edit endpoint exists, so updated_at is the best guess.
update public.listings set ended_at = updated_at where status <> 'active';

create function private.stamp_listing_ended_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status <> 'active' and old.status = 'active' then
    new.ended_at = now();
  elsif new.status = 'active' then
    new.ended_at = null;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_listing_ended_at() from public, anon, authenticated, hootus_api;

create trigger listings_ended_at before update of status on public.listings
for each row execute function private.stamp_listing_ended_at();

create index listings_author_sold_idx on public.listings (author_id, ended_at desc)
where status = 'sold';
