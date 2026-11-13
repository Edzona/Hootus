begin;

-- Listing photo URLs are shown to every member, so they must not contain the
-- uploader's Auth UUID. Files now sit at the bucket root under a random name,
-- and ownership comes from Storage's owner_id instead of the folder name.
drop policy listing_photos_owner_read on storage.objects;
drop policy listing_photos_owner_upload on storage.objects;
drop policy listing_photos_owner_delete on storage.objects;

-- Owner SELECT is required for Storage deletes; public reads use the public URL.
create policy listing_photos_owner_read on storage.objects for select to authenticated
using (bucket_id = 'listing-photos' and owner_id = (select auth.uid())::text);
create policy listing_photos_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'listing-photos' and owner_id = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$');
create policy listing_photos_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'listing-photos' and owner_id = (select auth.uid())::text);

-- True when every named file exists in listing-photos and the caller uploaded it.
create function private.owns_listing_photos(names text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from storage.objects o
    where o.bucket_id = 'listing-photos'
      and o.name = any(names)
      and o.owner_id = (select auth.uid())::text)
    = (select count(distinct n) from unnest(names) n)
$$;
revoke all on function private.owns_listing_photos(text[]) from public, anon, authenticated, hootus_api;
grant execute on function private.owns_listing_photos(text[]) to hootus_api;

commit;
