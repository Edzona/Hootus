-- Local development only. No passwords or API keys.
-- The existing Auth trigger creates the matching student profile.
begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'hootus-demo@temple.edu', '',
  now(),
  '{"provider":"email","providers":["email"],"hootus_local_test":true}',
  '{"full_name":"Hana Tanaka","student_id":"900000001"}',
  '', '', '', '', now(), now()
)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now()
from auth.users
where id = '00000000-0000-4000-8000-000000000001'
  and email = 'hootus-demo@temple.edu'
  and raw_app_meta_data ->> 'hootus_local_test' = 'true'
on conflict (provider_id, provider) do nothing;

commit;
