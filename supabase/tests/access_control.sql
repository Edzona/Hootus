-- Run as postgres in a disposable Supabase project's SQL Editor after migration.
-- All fixtures roll back. Any unexpected access raises an exception.
begin;

-- Temporary membership lets the database owner exercise the restricted role.
-- This grant rolls back along with the fixtures.
grant hootus_api to postgres;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'hootus-test-student@temple.edu', now(),
   '{"studentId":"000000001","role":"admin"}'),
  ('10000000-0000-0000-0000-000000000002', 'hootus-test-club@temple.edu', now(), '{}'),
  ('10000000-0000-0000-0000-000000000003', 'hootus-test-admin@temple.edu', now(), '{}'),
  ('10000000-0000-0000-0000-000000000004', 'hootus-test-unconfirmed@temple.edu', null, '{}');

do $$
begin
  assert (select role = 'student' and student_id = '000000001'
    from public.profiles where auth_user_id = '10000000-0000-0000-0000-000000000001'),
    'Signup must create a student and preserve leading zeroes';
  begin
    insert into auth.users (id, email)
    values ('10000000-0000-0000-0000-000000000005', 'outsider@example.com');
    raise exception 'Non-Temple signup was allowed';
  exception when check_violation then null;
  end;
  begin
    update auth.users set email = 'outsider@example.com'
    where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'Non-Temple email change was allowed';
  exception when check_violation then null;
  end;
end;
$$;

update public.profiles set role = 'club_leader'
where auth_user_id = '10000000-0000-0000-0000-000000000002';
update public.profiles set role = 'admin'
where auth_user_id = '10000000-0000-0000-0000-000000000003';

select set_config('test.recipient_id', (select id::text from public.profiles
  where auth_user_id = '10000000-0000-0000-0000-000000000002'), true);
select set_config('test.admin_id', (select id::text from public.profiles
  where auth_user_id = '10000000-0000-0000-0000-000000000003'), true);

set local role hootus_api;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.listings (category, title, price_jpy) values ('sales', 'Desk', 1500);
insert into public.messages (recipient_id, body)
values (current_setting('test.recipient_id')::bigint, 'Is the desk available?');

do $$
begin
  assert (select count(*) = 1 from public.profiles), 'Student must see only own profile';
  begin
    update public.profiles set role = 'admin' where id = private.current_profile_id();
    raise exception 'Self-promotion was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.feed_posts (kind, title, business_name)
    values ('perk', 'Unauthorized coupon', 'Shop');
    raise exception 'Student posted a perk';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (sender_id, recipient_id, body)
    values (current_setting('test.admin_id')::bigint,
            current_setting('test.recipient_id')::bigint, 'Spoofed');
    raise exception 'Sender impersonation was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
insert into public.feed_posts (kind, title, room_number, meeting_time)
values ('club_event', 'Club meeting', '301', '2026-11-01T18:00:00+09:00');
do $$
declare affected integer;
begin
  assert (select count(*) = 1 from public.messages), 'Recipient cannot read message';
  update public.listings set title = 'Hijacked';
  get diagnostics affected = row_count;
  assert affected = 0, 'Club leader edited another author listing';
  begin
    update public.feed_posts set kind = 'perk', business_name = 'Shop';
    raise exception 'Club leader converted event to perk';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
insert into public.feed_posts (kind, title, business_name, coupon_code)
values ('perk', 'Student discount', 'Local shop', 'TUJ10');
do $$
declare affected integer;
begin
  assert (select count(*) = 0 from public.messages), 'Admin read unrelated private messages';
  update public.listings set status = 'closed'
  where author_id = (select id from public.profiles
    where auth_user_id = '10000000-0000-0000-0000-000000000001');
  get diagnostics affected = row_count;
  assert affected = 1, 'Admin cannot moderate listing';
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
do $$
begin
  assert (select count(*) = 0 from public.listings), 'Unconfirmed user read listings';
  begin
    insert into public.listings (category, title) values ('gigs', 'Unauthorized');
    raise exception 'Unconfirmed user wrote a listing';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    perform 1 from public.listings;
    raise exception 'Browser role read application data';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.listings (category, title) values ('sales', 'Bypass attempt');
    raise exception 'Browser role bypassed the HTTP boundary';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.listings;
    raise exception 'Anonymous user read listings';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
do $$
begin
  assert not pg_has_role('authenticated', 'hootus_api', 'MEMBER'), 'Browser role can assume API role';
  assert not pg_has_role('authenticator', 'hootus_api', 'MEMBER'), 'PostgREST can assume API role';
  assert not (select rolbypassrls or rolsuper from pg_roles where rolname = 'hootus_server');
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ), 'Messages missing from Realtime publication';
end;
$$;
rollback;
