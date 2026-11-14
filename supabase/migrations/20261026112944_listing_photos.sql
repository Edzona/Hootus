begin;

-- Listing photos follow the same pattern as profile photos: the browser uploads
-- to Storage, then saves the public URLs through the API, which checks they
-- point into the caller's own folder. Public bucket so <img> tags work; random
-- file names keep URLs unguessable. Size and type limits are enforced by Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files live directly inside a folder named by the uploader's Auth UUID:
-- listing-photos/<auth uuid>/<file>. No UPDATE policy: uploads use new names.
-- Owner SELECT is required for Storage deletes; public reads use the public URL.
create policy listing_photos_owner_read on storage.objects for select to authenticated
using (bucket_id = 'listing-photos' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy listing_photos_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'listing-photos' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy listing_photos_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'listing-photos' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
