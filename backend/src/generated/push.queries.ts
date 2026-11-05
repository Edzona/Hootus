/** Types generated for queries found in "../supabase/queries/push.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'SavePushSubscription' parameters type */
export interface ISavePushSubscriptionParams {
  auth: string;
  endpoint: string;
  p256dh: string;
}

/** 'SavePushSubscription' return type */
export interface ISavePushSubscriptionResult {
  id: string | null;
}

/** 'SavePushSubscription' query type */
export interface ISavePushSubscriptionQuery {
  params: ISavePushSubscriptionParams;
  result: ISavePushSubscriptionResult;
}

const savePushSubscriptionIR: any = {"usedParamSet":{"endpoint":true,"p256dh":true,"auth":true},"params":[{"name":"endpoint","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":102}]},{"name":"p256dh","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":118}]},{"name":"auth","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":132}]}],"statement":"-- Null id means the caller is not a confirmed member.\nselect private.save_push_subscription(:endpoint!::text, :p256dh!::text, :auth!::text) as id"};

/**
 * Query generated from SQL:
 * ```
 * -- Null id means the caller is not a confirmed member.
 * select private.save_push_subscription(:endpoint!::text, :p256dh!::text, :auth!::text) as id
 * ```
 */
export const savePushSubscription = new PreparedQuery<ISavePushSubscriptionParams,ISavePushSubscriptionResult>(savePushSubscriptionIR);


/** 'DeletePushSubscription' parameters type */
export interface IDeletePushSubscriptionParams {
  endpoint: string;
}

/** 'DeletePushSubscription' return type */
export interface IDeletePushSubscriptionResult {
  id: string;
}

/** 'DeletePushSubscription' query type */
export interface IDeletePushSubscriptionQuery {
  params: IDeletePushSubscriptionParams;
  result: IDeletePushSubscriptionResult;
}

const deletePushSubscriptionIR: any = {"usedParamSet":{"endpoint":true},"params":[{"name":"endpoint","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":141}]}],"statement":"-- RLS limits this to your own devices. Zero rows is fine (already removed).\ndelete from public.push_subscriptions where endpoint = :endpoint!::text\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * -- RLS limits this to your own devices. Zero rows is fine (already removed).
 * delete from public.push_subscriptions where endpoint = :endpoint!::text
 * returning public_id as id
 * ```
 */
export const deletePushSubscription = new PreparedQuery<IDeletePushSubscriptionParams,IDeletePushSubscriptionResult>(deletePushSubscriptionIR);


/** 'CountPushSubscriptions' parameters type */
export type ICountPushSubscriptionsParams = void;

/** 'CountPushSubscriptions' return type */
export interface ICountPushSubscriptionsResult {
  devices: number | null;
}

/** 'CountPushSubscriptions' query type */
export interface ICountPushSubscriptionsQuery {
  params: ICountPushSubscriptionsParams;
  result: ICountPushSubscriptionsResult;
}

const countPushSubscriptionsIR: any = {"usedParamSet":{},"params":[],"statement":"select count(*)::int as devices from public.push_subscriptions"};

/**
 * Query generated from SQL:
 * ```
 * select count(*)::int as devices from public.push_subscriptions
 * ```
 */
export const countPushSubscriptions = new PreparedQuery<ICountPushSubscriptionsParams,ICountPushSubscriptionsResult>(countPushSubscriptionsIR);


/** 'ClaimMessagePush' parameters type */
export interface IClaimMessagePushParams {
  messageId: string;
}

/** 'ClaimMessagePush' return type */
export interface IClaimMessagePushResult {
  auth: string | null;
  conversation_id: string | null;
  endpoint: string | null;
  listing_title: string | null;
  notification_id: string | null;
  p256dh: string | null;
  sender_name: string | null;
}

/** 'ClaimMessagePush' query type */
export interface IClaimMessagePushQuery {
  params: IClaimMessagePushParams;
  result: IClaimMessagePushResult;
}

const claimMessagePushIR: any = {"usedParamSet":{"messageId":true},"params":[{"name":"messageId","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":135}]}],"statement":"-- Zero rows: no push is due. One row with null endpoint: recipient has no devices.\nselect * from private.claim_message_push(:messageId!::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * -- Zero rows: no push is due. One row with null endpoint: recipient has no devices.
 * select * from private.claim_message_push(:messageId!::uuid)
 * ```
 */
export const claimMessagePush = new PreparedQuery<IClaimMessagePushParams,IClaimMessagePushResult>(claimMessagePushIR);


/** 'FinishNotificationPush' parameters type */
export interface IFinishNotificationPushParams {
  deadEndpoints: stringArray;
  notificationId: string;
  okEndpoints: stringArray;
  outcome: string;
}

/** 'FinishNotificationPush' return type */
export interface IFinishNotificationPushResult {
  finished: boolean | null;
}

/** 'FinishNotificationPush' query type */
export interface IFinishNotificationPushQuery {
  params: IFinishNotificationPushParams;
  result: IFinishNotificationPushResult;
}

const finishNotificationPushIR: any = {"usedParamSet":{"notificationId":true,"outcome":true,"okEndpoints":true,"deadEndpoints":true},"params":[{"name":"notificationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":40,"b":55}]},{"name":"outcome","required":true,"transform":{"type":"scalar"},"locs":[{"a":64,"b":72}]},{"name":"okEndpoints","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":95}]},{"name":"deadEndpoints","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":120}]}],"statement":"select private.finish_notification_push(:notificationId!::uuid, :outcome!::text,\n  :okEndpoints!::text[], :deadEndpoints!::text[]) as finished"};

/**
 * Query generated from SQL:
 * ```
 * select private.finish_notification_push(:notificationId!::uuid, :outcome!::text,
 *   :okEndpoints!::text[], :deadEndpoints!::text[]) as finished
 * ```
 */
export const finishNotificationPush = new PreparedQuery<IFinishNotificationPushParams,IFinishNotificationPushResult>(finishNotificationPushIR);


