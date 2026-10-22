begin;

-- Profile photos live in Supabase Storage. Application tables stay API-only:
-- the browser uploads the image file, then saves its URL through the API,
-- which checks the URL points into the caller's own folder.
-- The bucket is public so <img> tags work without signed URLs; random file
-- names keep URLs unguessable. Size and type limits are enforced by Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each student may only touch files directly inside a folder named by their
-- Auth UUID: avatars/<auth uuid>/<file>. Signup already restricts Auth users to
-- Temple emails. No UPDATE policy: uploads use new names instead of upserts.
-- Owner SELECT is required for Storage deletes; public reads use the public URL.
create policy avatars_owner_read on storage.objects for select to authenticated
using (bucket_id = 'avatars' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_upload on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.profiles add constraint profiles_bio_length check (char_length(bio) <= 500);

commit;
