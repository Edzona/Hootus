/* @name CreateContentReport */
with target as (
  select l.public_id
  from public.listings l
  where :targetKind!::text = 'listing'
    and l.public_id = :targetId!::uuid
    and l.hidden_at is null
  union all
  select f.public_id
  from public.feed_posts f
  where :targetKind!::text = 'feed_post'
    and f.public_id = :targetId!::uuid
    and f.hidden_at is null
  union all
  select p.public_id
  from public.club_posts p
  where :targetKind!::text = 'club_post'
    and p.public_id = :targetId!::uuid
    and p.hidden_at is null
)
insert into public.content_reports (target_kind, target_public_id, reason)
select :targetKind!::text, target.public_id, :reason!::text
from target
returning public_id as id, status;

/* @name GetModerationReports */
select r.public_id as id, r.target_kind as kind, r.target_public_id as target_id,
  case r.target_kind
    when 'listing' then l.title
    when 'feed_post' then f.title
    when 'club_post' then left(p.body, 200)
  end as target_title,
  case r.target_kind
    when 'listing' then private.author_name(l.author_id)
    when 'feed_post' then private.author_name(f.author_id)
    when 'club_post' then private.author_name(p.author_id)
  end as target_author_name,
  case r.target_kind
    when 'listing' then case when l.id is null then null else l.hidden_at is not null end
    when 'feed_post' then case when f.id is null then null else f.hidden_at is not null end
    when 'club_post' then case when p.id is null then null else p.hidden_at is not null end
  end as target_hidden,
  r.reason, r.status, r.created_at, r.resolved_at
from public.content_reports r
left join public.listings l on r.target_kind = 'listing' and l.public_id = r.target_public_id
left join public.feed_posts f on r.target_kind = 'feed_post' and f.public_id = r.target_public_id
left join public.club_posts p on r.target_kind = 'club_post' and p.public_id = r.target_public_id
where r.status = :status!::text
order by r.created_at desc, r.id desc
limit :limit!::int offset :offset!::int;

/* @name UpdateModerationReport */
update public.content_reports
set status = :status!::text,
    resolved_by = (select private.current_profile_id()),
    resolved_at = now()
where public_id = :id!::uuid and status = 'open'
returning public_id as id, status, resolved_at;

/* @name GetModerationContent */
with open_reports as (
  select target_kind, target_public_id, count(*)::int as report_count
  from public.content_reports
  where status = 'open'
  group by target_kind, target_public_id
), content as (
  select l.id as order_id, l.public_id as id, 'listing'::text as kind,
    l.title, left(l.description, 300) as preview, null::text as club_name,
    private.author_name(l.author_id) as author_name, l.hidden_at is not null as hidden,
    coalesce(r.report_count, 0) as open_reports, l.created_at
  from public.listings l
  left join open_reports r on r.target_kind = 'listing' and r.target_public_id = l.public_id
  where :kind!::text = 'listing'
    and (:hidden::boolean is null or (l.hidden_at is not null) = :hidden::boolean)
  union all
  select f.id, f.public_id, 'feed_post'::text,
    f.title, left(f.body, 300), null::text,
    private.author_name(f.author_id), f.hidden_at is not null,
    coalesce(r.report_count, 0), f.created_at
  from public.feed_posts f
  left join open_reports r on r.target_kind = 'feed_post' and r.target_public_id = f.public_id
  where :kind!::text = 'feed_post'
    and (:hidden::boolean is null or (f.hidden_at is not null) = :hidden::boolean)
  union all
  select p.id, p.public_id, 'club_post'::text,
    null::text, left(p.body, 300), c.name,
    private.author_name(p.author_id), p.hidden_at is not null,
    coalesce(r.report_count, 0), p.created_at
  from public.club_posts p
  join public.clubs c on c.id = p.club_id
  left join open_reports r on r.target_kind = 'club_post' and r.target_public_id = p.public_id
  where :kind!::text = 'club_post'
    and (:hidden::boolean is null or (p.hidden_at is not null) = :hidden::boolean)
)
select id, kind, title, preview, club_name, author_name, hidden, open_reports, created_at
from content
order by created_at desc, order_id desc
limit :limit!::int offset :offset!::int;

/* @name SetContentHidden */
select id, kind, hidden
from private.set_content_hidden(:targetKind!::text, :targetId!::uuid, :hidden!::boolean);

/* @name DeleteContent */
select id from private.delete_content(:targetKind!::text, :targetId!::uuid);
