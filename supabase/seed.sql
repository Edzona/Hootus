-- Local development only. Never apply this file to a hosted project.
-- The existing Auth trigger creates the matching student profile.
begin;

-- Well-known local password for the API's dedicated login, like the local
-- postgres:postgres owner. Hosted projects set their own secret instead.
alter role hootus_server password 'postgres';

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

-- Campus fixtures are illustrative, never official TUJ club or housing records.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'hootus-clubs@temple.edu', '', now(),
  '{"provider":"email","providers":["email"],"hootus_local_test":true}',
  '{"full_name":"Campus clubs demo"}', '', '', '', '', now(), now()
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select id::text, id, jsonb_build_object('sub',id::text,'email',email,'email_verified',true), 'email',now(),now()
from auth.users where id = '00000000-0000-4000-8000-000000000002'
  and email = 'hootus-clubs@temple.edu' and raw_app_meta_data ->> 'hootus_local_test' = 'true'
on conflict (provider_id,provider) do nothing;
update public.profiles set role = 'club_leader'
where auth_user_id = '00000000-0000-4000-8000-000000000002'
  and email = 'hootus-clubs@temple.edu'
  and exists (select 1 from auth.users where id = auth_user_id and raw_app_meta_data ->> 'hootus_local_test' = 'true');
insert into public.clubs (public_id,slug,name,handle,mark,color,category,description,meeting,location,leader_id,is_sample)
select '10000000-0000-4000-8000-000000000001','film','Film Club','tujfilm','fc.','plum','Arts & culture','Good films. Better conversations. A space for film lovers, first-time filmmakers, and everyone in between.','Fridays, 18:30','Campus screening room',id,true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000002' and email='hootus-clubs@temple.edu' and role='club_leader'
on conflict (public_id) do nothing;
insert into public.clubs (public_id,slug,name,handle,mark,color,category,description,meeting,location,leader_id,is_sample)
select '10000000-0000-4000-8000-000000000002','outdoor','Outdoor Club','tujoutdoors','↟','forest','Outdoors','Take the scenic route. Weekend hikes, city walks, and little escapes from Tokyo with good company.','Weekend meetups','Around Tokyo and beyond',id,true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000002' and email='hootus-clubs@temple.edu' and role='club_leader'
on conflict (public_id) do nothing;
insert into public.clubs (public_id,slug,name,handle,mark,color,category,description,meeting,location,leader_id,is_sample)
select '10000000-0000-4000-8000-000000000003','photo','Photography Club','tujphoto','◎','blue','Arts & culture','See Tokyo a little differently. Bring your camera, your phone, or just your curiosity.','Wednesdays, 17:00','Campus lounge',id,true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000002' and email='hootus-clubs@temple.edu' and role='club_leader'
on conflict (public_id) do nothing;
insert into public.clubs (public_id,slug,name,handle,mark,color,category,description,meeting,location,leader_id,is_sample)
select '10000000-0000-4000-8000-000000000004','business','Japan Business Society','tujbusiness','jb','gold','Careers','Meet people, exchange ideas, and explore what working in Japan could look like.','Thursdays, 17:30','Campus lounge',id,true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000002' and email='hootus-clubs@temple.edu' and role='club_leader'
on conflict (public_id) do nothing;
insert into public.clubs (public_id,slug,name,handle,mark,color,category,description,meeting,location,leader_id,is_sample)
select '10000000-0000-4000-8000-000000000005','music','Music Collective','tujmusic','♫','rose','Music','Bedroom producers, shower singers, and seasoned musicians. There is room for all of us.','Tuesdays, 18:00','Student commons',id,true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000002' and email='hootus-clubs@temple.edu' and role='club_leader'
on conflict (public_id) do nothing;
insert into public.club_events (public_id,slug,club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note)
select '20000000-0000-4000-8000-000000000001','screening',id,'Friday night, on film.','2026-10-30T18:30:00+09:00','2026-10-30T21:00:00+09:00','Campus screening room','Free entry','Screening','film','An evening of Japanese cinema and conversation. Come early, find a seat, and meet a few new faces. We’ll share the film selection with attendees before the screening.','Open to all students. No film knowledge needed.' from public.clubs where public_id='10000000-0000-4000-8000-000000000001'
on conflict (public_id) do nothing;
insert into public.club_events (public_id,slug,club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note)
select '20000000-0000-4000-8000-000000000002','photowalk',id,'A different side of Shimokita.','2026-10-31T14:00:00+09:00','2026-10-31T16:30:00+09:00','Shimokitazawa Station, east exit','Free entry','Photo walk','photo','An unhurried afternoon exploring the backstreets of Shimokitazawa. We’ll look for small details, trade photo tips, and stop for coffee along the way.','Phone cameras welcome. Bring comfortable shoes.' from public.clubs where public_id='10000000-0000-4000-8000-000000000003'
on conflict (public_id) do nothing;
insert into public.club_events (public_id,slug,club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note)
select '20000000-0000-4000-8000-000000000003','hike',id,'Out of office. Into the trees.','2026-11-01T08:00:00+09:00','2026-11-01T16:00:00+09:00','Takaosanguchi Station','Bring train fare & lunch','Day hike','outdoor','A relaxed hike up Mount Takao with time for lunch and a view. We’ll walk together and take breaks along the way.','Bring water, walking shoes, and a layer for the summit. Weather updates will appear here.' from public.clubs where public_id='10000000-0000-4000-8000-000000000002'
on conflict (public_id) do nothing;
insert into public.club_posts (public_id,club_id,author_id,event_id,body,created_at)
select '30000000-0000-4000-8000-000000000001',c.id,c.leader_id,(select id from public.club_events where public_id='20000000-0000-4000-8000-000000000001'),'Your Friday plans, sorted. Join us for a screening, stay for the conversation. Bring a friend or come solo — there’s always a seat for you.',now()-interval '1 hours' from public.clubs c where c.public_id='10000000-0000-4000-8000-000000000001'
on conflict (public_id) do nothing;
insert into public.club_posts (public_id,club_id,author_id,event_id,body,created_at)
select '30000000-0000-4000-8000-000000000002',c.id,c.leader_id,(select id from public.club_events where public_id='20000000-0000-4000-8000-000000000002'),'Tokyo looks different when you slow down. We’re taking the long way through Shimokitazawa this Saturday. Any camera. Any experience level. See you there?',now()-interval '2 hours' from public.clubs c where c.public_id='10000000-0000-4000-8000-000000000003'
on conflict (public_id) do nothing;
insert into public.club_posts (public_id,club_id,author_id,event_id,body,created_at)
select '30000000-0000-4000-8000-000000000003',c.id,c.leader_id,null,'A little reminder: you don’t need a five-year plan to come to our next meetup. Just bring your questions about working in Japan. We’ll bring the conversation.',now()-interval '3 hours' from public.clubs c where c.public_id='10000000-0000-4000-8000-000000000004'
on conflict (public_id) do nothing;
insert into public.club_posts (public_id,club_id,author_id,event_id,body,created_at)
select '30000000-0000-4000-8000-000000000004',c.id,c.leader_id,(select id from public.club_events where public_id='20000000-0000-4000-8000-000000000003'),'Trading the train rush for a trail this weekend. Our next stop: Mount Takao. First hike? You’re in good company.',now()-interval '4 hours' from public.clubs c where c.public_id='10000000-0000-4000-8000-000000000002'
on conflict (public_id) do nothing;
insert into public.club_posts (public_id,club_id,author_id,event_id,body,created_at)
select '30000000-0000-4000-8000-000000000005',c.id,c.leader_id,null,'Looking for someone to jam with? Drop by our Tuesday session. Instruments, half-finished songs, and enthusiastic listeners all welcome.',now()-interval '5 hours' from public.clubs c where c.public_id='10000000-0000-4000-8000-000000000005'
on conflict (public_id) do nothing;
insert into public.listings (public_id,author_id,category,title,description,price_jpy,location,is_sample)
select '40000000-0000-4000-8000-000000000001',id,'sales','A desk for your next all-nighter','Compact wooden desk, 90 × 45 cm. collection near Sangenjaya Station.',3000,'Sangenjaya',true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000001' and email='hootus-demo@temple.edu'
on conflict (public_id) do nothing;
insert into public.listings (public_id,author_id,category,title,description,price_jpy,location,is_sample)
select '40000000-0000-4000-8000-000000000002',id,'sales','A new perspective','A beginner-friendly point-and-shoot camera with a wrist strap. campus collection.',8500,'Sangenjaya',true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000001' and email='hootus-demo@temple.edu'
on conflict (public_id) do nothing;
insert into public.listings (public_id,author_id,category,title,description,price_jpy,location,is_sample)
select '40000000-0000-4000-8000-000000000003',id,'housing','A little closer to campus','Private room in a shared apartment near Sangenjaya. utilities extra, availability and terms to be confirmed.',72000,'Sangenjaya',true from public.profiles where auth_user_id='00000000-0000-4000-8000-000000000001' and email='hootus-demo@temple.edu'
on conflict (public_id) do nothing;
insert into public.club_follows (profile_id,club_id)
select p.id,c.id from public.profiles p cross join public.clubs c where p.auth_user_id='00000000-0000-4000-8000-000000000001' and p.email='hootus-demo@temple.edu' and c.public_id='10000000-0000-4000-8000-000000000001'
on conflict (profile_id,club_id) do nothing;
insert into public.club_follows (profile_id,club_id)
select p.id,c.id from public.profiles p cross join public.clubs c where p.auth_user_id='00000000-0000-4000-8000-000000000001' and p.email='hootus-demo@temple.edu' and c.public_id='10000000-0000-4000-8000-000000000002'
on conflict (profile_id,club_id) do nothing;

commit;
