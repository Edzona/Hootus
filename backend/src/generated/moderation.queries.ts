/** Types generated for queries found in "../supabase/queries/moderation.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'CreateContentReport' parameters type */
export interface ICreateContentReportParams {
  reason: string;
  targetId: string;
  targetKind: string;
}

/** 'CreateContentReport' return type */
export interface ICreateContentReportResult {
  id: string;
  status: string;
}

/** 'CreateContentReport' query type */
export interface ICreateContentReportQuery {
  params: ICreateContentReportParams;
  result: ICreateContentReportResult;
}

const createContentReportIR: any = {"usedParamSet":{"targetKind":true,"targetId":true,"reason":true},"params":[{"name":"targetKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":82},{"a":237,"b":248},{"a":405,"b":416},{"a":589,"b":600}]},{"name":"targetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":133},{"a":292,"b":301},{"a":460,"b":469}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":627,"b":634}]}],"statement":"with target as (\n  select l.public_id\n  from public.listings l\n  where :targetKind!::text = 'listing'\n    and l.public_id = :targetId!::uuid\n    and l.hidden_at is null\n  union all\n  select f.public_id\n  from public.feed_posts f\n  where :targetKind!::text = 'feed_post'\n    and f.public_id = :targetId!::uuid\n    and f.hidden_at is null\n  union all\n  select p.public_id\n  from public.club_posts p\n  where :targetKind!::text = 'club_post'\n    and p.public_id = :targetId!::uuid\n    and p.hidden_at is null\n)\ninsert into public.content_reports (target_kind, target_public_id, reason)\nselect :targetKind!::text, target.public_id, :reason!::text\nfrom target\nreturning public_id as id, status"};

/**
 * Query generated from SQL:
 * ```
 * with target as (
 *   select l.public_id
 *   from public.listings l
 *   where :targetKind!::text = 'listing'
 *     and l.public_id = :targetId!::uuid
 *     and l.hidden_at is null
 *   union all
 *   select f.public_id
 *   from public.feed_posts f
 *   where :targetKind!::text = 'feed_post'
 *     and f.public_id = :targetId!::uuid
 *     and f.hidden_at is null
 *   union all
 *   select p.public_id
 *   from public.club_posts p
 *   where :targetKind!::text = 'club_post'
 *     and p.public_id = :targetId!::uuid
 *     and p.hidden_at is null
 * )
 * insert into public.content_reports (target_kind, target_public_id, reason)
 * select :targetKind!::text, target.public_id, :reason!::text
 * from target
 * returning public_id as id, status
 * ```
 */
export const createContentReport = new PreparedQuery<ICreateContentReportParams,ICreateContentReportResult>(createContentReportIR);


/** 'GetModerationReports' parameters type */
export interface IGetModerationReportsParams {
  limit: number;
  offset: number;
  status: string;
}

/** 'GetModerationReports' return type */
export interface IGetModerationReportsResult {
  created_at: Date;
  id: string;
  kind: string;
  reason: string;
  resolved_at: Date | null;
  status: string;
  target_author_name: string | null;
  target_hidden: boolean | null;
  target_id: string;
  target_title: string | null;
}

/** 'GetModerationReports' query type */
export interface IGetModerationReportsQuery {
  params: IGetModerationReportsParams;
  result: IGetModerationReportsResult;
}

const getModerationReportsIR: any = {"usedParamSet":{"status":true,"limit":true,"offset":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":1167,"b":1174}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1226,"b":1232}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":1246,"b":1253}]}],"statement":"select r.public_id as id, r.target_kind as kind, r.target_public_id as target_id,\n  case r.target_kind\n    when 'listing' then l.title\n    when 'feed_post' then f.title\n    when 'club_post' then left(p.body, 200)\n  end as target_title,\n  case r.target_kind\n    when 'listing' then private.author_name(l.author_id)\n    when 'feed_post' then private.author_name(f.author_id)\n    when 'club_post' then private.author_name(p.author_id)\n  end as target_author_name,\n  case r.target_kind\n    when 'listing' then case when l.id is null then null else l.hidden_at is not null end\n    when 'feed_post' then case when f.id is null then null else f.hidden_at is not null end\n    when 'club_post' then case when p.id is null then null else p.hidden_at is not null end\n  end as target_hidden,\n  r.reason, r.status, r.created_at, r.resolved_at\nfrom public.content_reports r\nleft join public.listings l on r.target_kind = 'listing' and l.public_id = r.target_public_id\nleft join public.feed_posts f on r.target_kind = 'feed_post' and f.public_id = r.target_public_id\nleft join public.club_posts p on r.target_kind = 'club_post' and p.public_id = r.target_public_id\nwhere r.status = :status!::text\norder by r.created_at desc, r.id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select r.public_id as id, r.target_kind as kind, r.target_public_id as target_id,
 *   case r.target_kind
 *     when 'listing' then l.title
 *     when 'feed_post' then f.title
 *     when 'club_post' then left(p.body, 200)
 *   end as target_title,
 *   case r.target_kind
 *     when 'listing' then private.author_name(l.author_id)
 *     when 'feed_post' then private.author_name(f.author_id)
 *     when 'club_post' then private.author_name(p.author_id)
 *   end as target_author_name,
 *   case r.target_kind
 *     when 'listing' then case when l.id is null then null else l.hidden_at is not null end
 *     when 'feed_post' then case when f.id is null then null else f.hidden_at is not null end
 *     when 'club_post' then case when p.id is null then null else p.hidden_at is not null end
 *   end as target_hidden,
 *   r.reason, r.status, r.created_at, r.resolved_at
 * from public.content_reports r
 * left join public.listings l on r.target_kind = 'listing' and l.public_id = r.target_public_id
 * left join public.feed_posts f on r.target_kind = 'feed_post' and f.public_id = r.target_public_id
 * left join public.club_posts p on r.target_kind = 'club_post' and p.public_id = r.target_public_id
 * where r.status = :status!::text
 * order by r.created_at desc, r.id desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getModerationReports = new PreparedQuery<IGetModerationReportsParams,IGetModerationReportsResult>(getModerationReportsIR);


/** 'UpdateModerationReport' parameters type */
export interface IUpdateModerationReportParams {
  id: string;
  status: string;
}

/** 'UpdateModerationReport' return type */
export interface IUpdateModerationReportResult {
  id: string;
  resolved_at: Date | null;
  status: string;
}

/** 'UpdateModerationReport' query type */
export interface IUpdateModerationReportQuery {
  params: IUpdateModerationReportParams;
  result: IUpdateModerationReportResult;
}

const updateModerationReportIR: any = {"usedParamSet":{"status":true,"id":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":43,"b":50}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":161}]}],"statement":"update public.content_reports\nset status = :status!::text,\n    resolved_by = (select private.current_profile_id()),\n    resolved_at = now()\nwhere public_id = :id!::uuid and status = 'open'\nreturning public_id as id, status, resolved_at"};

/**
 * Query generated from SQL:
 * ```
 * update public.content_reports
 * set status = :status!::text,
 *     resolved_by = (select private.current_profile_id()),
 *     resolved_at = now()
 * where public_id = :id!::uuid and status = 'open'
 * returning public_id as id, status, resolved_at
 * ```
 */
export const updateModerationReport = new PreparedQuery<IUpdateModerationReportParams,IUpdateModerationReportResult>(updateModerationReportIR);


/** 'GetModerationContent' parameters type */
export interface IGetModerationContentParams {
  hidden?: boolean | null | void;
  kind: string;
  limit: number;
  offset: number;
}

/** 'GetModerationContent' return type */
export interface IGetModerationContentResult {
  author_name: string | null;
  club_name: string | null;
  created_at: Date | null;
  hidden: boolean | null;
  id: string | null;
  kind: string | null;
  open_reports: number | null;
  preview: string | null;
  title: string | null;
}

/** 'GetModerationContent' query type */
export interface IGetModerationContentQuery {
  params: IGetModerationContentParams;
  result: IGetModerationContentResult;
}

const getModerationContentIR: any = {"usedParamSet":{"kind":true,"hidden":true,"limit":true,"offset":true},"params":[{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":626,"b":631},{"a":1076,"b":1081},{"a":1569,"b":1574}]},{"name":"hidden","required":false,"transform":{"type":"scalar"},"locs":[{"a":660,"b":666},{"a":716,"b":722},{"a":1112,"b":1118},{"a":1168,"b":1174},{"a":1605,"b":1611},{"a":1661,"b":1667}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1830,"b":1836}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":1850,"b":1857}]}],"statement":"with open_reports as (\n  select target_kind, target_public_id, count(*)::int as report_count\n  from public.content_reports\n  where status = 'open'\n  group by target_kind, target_public_id\n), content as (\n  select l.id as order_id, l.public_id as id, 'listing'::text as kind,\n    l.title, left(l.description, 300) as preview, null::text as club_name,\n    private.author_name(l.author_id) as author_name, l.hidden_at is not null as hidden,\n    coalesce(r.report_count, 0) as open_reports, l.created_at\n  from public.listings l\n  left join open_reports r on r.target_kind = 'listing' and r.target_public_id = l.public_id\n  where :kind!::text = 'listing'\n    and (:hidden::boolean is null or (l.hidden_at is not null) = :hidden::boolean)\n  union all\n  select f.id, f.public_id, 'feed_post'::text,\n    f.title, left(f.body, 300), null::text,\n    private.author_name(f.author_id), f.hidden_at is not null,\n    coalesce(r.report_count, 0), f.created_at\n  from public.feed_posts f\n  left join open_reports r on r.target_kind = 'feed_post' and r.target_public_id = f.public_id\n  where :kind!::text = 'feed_post'\n    and (:hidden::boolean is null or (f.hidden_at is not null) = :hidden::boolean)\n  union all\n  select p.id, p.public_id, 'club_post'::text,\n    null::text, left(p.body, 300), c.name,\n    private.author_name(p.author_id), p.hidden_at is not null,\n    coalesce(r.report_count, 0), p.created_at\n  from public.club_posts p\n  join public.clubs c on c.id = p.club_id\n  left join open_reports r on r.target_kind = 'club_post' and r.target_public_id = p.public_id\n  where :kind!::text = 'club_post'\n    and (:hidden::boolean is null or (p.hidden_at is not null) = :hidden::boolean)\n)\nselect id, kind, title, preview, club_name, author_name, hidden, open_reports, created_at\nfrom content\norder by created_at desc, order_id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * with open_reports as (
 *   select target_kind, target_public_id, count(*)::int as report_count
 *   from public.content_reports
 *   where status = 'open'
 *   group by target_kind, target_public_id
 * ), content as (
 *   select l.id as order_id, l.public_id as id, 'listing'::text as kind,
 *     l.title, left(l.description, 300) as preview, null::text as club_name,
 *     private.author_name(l.author_id) as author_name, l.hidden_at is not null as hidden,
 *     coalesce(r.report_count, 0) as open_reports, l.created_at
 *   from public.listings l
 *   left join open_reports r on r.target_kind = 'listing' and r.target_public_id = l.public_id
 *   where :kind!::text = 'listing'
 *     and (:hidden::boolean is null or (l.hidden_at is not null) = :hidden::boolean)
 *   union all
 *   select f.id, f.public_id, 'feed_post'::text,
 *     f.title, left(f.body, 300), null::text,
 *     private.author_name(f.author_id), f.hidden_at is not null,
 *     coalesce(r.report_count, 0), f.created_at
 *   from public.feed_posts f
 *   left join open_reports r on r.target_kind = 'feed_post' and r.target_public_id = f.public_id
 *   where :kind!::text = 'feed_post'
 *     and (:hidden::boolean is null or (f.hidden_at is not null) = :hidden::boolean)
 *   union all
 *   select p.id, p.public_id, 'club_post'::text,
 *     null::text, left(p.body, 300), c.name,
 *     private.author_name(p.author_id), p.hidden_at is not null,
 *     coalesce(r.report_count, 0), p.created_at
 *   from public.club_posts p
 *   join public.clubs c on c.id = p.club_id
 *   left join open_reports r on r.target_kind = 'club_post' and r.target_public_id = p.public_id
 *   where :kind!::text = 'club_post'
 *     and (:hidden::boolean is null or (p.hidden_at is not null) = :hidden::boolean)
 * )
 * select id, kind, title, preview, club_name, author_name, hidden, open_reports, created_at
 * from content
 * order by created_at desc, order_id desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getModerationContent = new PreparedQuery<IGetModerationContentParams,IGetModerationContentResult>(getModerationContentIR);


/** 'SetContentHidden' parameters type */
export interface ISetContentHiddenParams {
  hidden: boolean;
  targetId: string;
  targetKind: string;
}

/** 'SetContentHidden' return type */
export interface ISetContentHiddenResult {
  hidden: boolean | null;
  id: string | null;
  kind: string | null;
}

/** 'SetContentHidden' query type */
export interface ISetContentHiddenQuery {
  params: ISetContentHiddenParams;
  result: ISetContentHiddenResult;
}

const setContentHiddenIR: any = {"usedParamSet":{"targetKind":true,"targetId":true,"hidden":true},"params":[{"name":"targetKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":56,"b":67}]},{"name":"targetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":76,"b":85}]},{"name":"hidden","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":101}]}],"statement":"select id, kind, hidden\nfrom private.set_content_hidden(:targetKind!::text, :targetId!::uuid, :hidden!::boolean)"};

/**
 * Query generated from SQL:
 * ```
 * select id, kind, hidden
 * from private.set_content_hidden(:targetKind!::text, :targetId!::uuid, :hidden!::boolean)
 * ```
 */
export const setContentHidden = new PreparedQuery<ISetContentHiddenParams,ISetContentHiddenResult>(setContentHiddenIR);


/** 'DeleteContent' parameters type */
export interface IDeleteContentParams {
  targetId: string;
  targetKind: string;
}

/** 'DeleteContent' return type */
export interface IDeleteContentResult {
  id: string | null;
}

/** 'DeleteContent' query type */
export interface IDeleteContentQuery {
  params: IDeleteContentParams;
  result: IDeleteContentResult;
}

const deleteContentIR: any = {"usedParamSet":{"targetKind":true,"targetId":true},"params":[{"name":"targetKind","required":true,"transform":{"type":"scalar"},"locs":[{"a":38,"b":49}]},{"name":"targetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":67}]}],"statement":"select id from private.delete_content(:targetKind!::text, :targetId!::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * select id from private.delete_content(:targetKind!::text, :targetId!::uuid)
 * ```
 */
export const deleteContent = new PreparedQuery<IDeleteContentParams,IDeleteContentResult>(deleteContentIR);


