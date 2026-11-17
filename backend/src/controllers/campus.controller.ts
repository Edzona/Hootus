import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  getCampusClubs, getCampusEvents, getCampusPosts, getSavedCampusPosts, getCampusListings,
  setCampusFollow, setCampusLike, setCampusSave, setCampusRsvp,
  getPublishableClub, createCampusPost, createCampusEvent,
  requestClubMembership, leaveClubMembership, getClubMembers, updateClubMember, removeClubMember,
  createClubRequest, getMyClubRequests, updateClub as editClub,
} from '../generated/campus.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { forbidden, HttpError, notFound } from '../helpers/errors.js';
import {
  assertOwnsPhotos, extractPhotoNames, imageUrlsSchema, orgDescriptionSchema, orgHandleSchema, orgNameSchema, orgTextSchema, pageSchema,
} from '../helpers/validation.js';
import {
  CampusAction, ClubCategory, ClubColor, EventPoster, MemberRole, PartnerCategory, ReviewStatus,
} from '../types/domain.js';
import { ErrorCode } from '../types/errorCode.js';

export const campusActionParams = z.strictObject({ action: z.enum(CampusAction), id: z.uuid() });
export const campusActionBody = z.strictObject({ active: z.boolean() });
export const campusClubParams = z.strictObject({ clubId: z.uuid() });
export const campusPostBody = z.strictObject({
  text: z.string().trim().min(1).max(10000),
  eventId: z.uuid().optional(),
  image_urls: imageUrlsSchema,
});
export const campusEventBody = z.strictObject({
  title: z.string().trim().min(1).max(200),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }),
  location: z.string().trim().min(1).max(300),
  price: z.string().trim().min(1).max(100).default('Free entry'),
  event_type: z.string().trim().min(1).max(80),
  poster: z.enum(EventPoster).default(EventPoster.Film),
  description: z.string().trim().max(10000).default(''),
  note: z.string().trim().max(1000).default(''),
  image_urls: imageUrlsSchema,
}).refine(event => Date.parse(event.ends_at) > Date.parse(event.starts_at), {
  message: 'End time must be after start time.', path: ['ends_at'],
});

export const campusMemberParams = z.strictObject({ clubId: z.uuid(), memberId: z.uuid() });
export const updateMemberBody = z.strictObject({
  status: z.enum([ReviewStatus.Approved, ReviewStatus.Rejected]).optional(),
  role: z.enum(MemberRole).optional(),
}).refine(v => v.status !== undefined || v.role !== undefined, { message: 'Provide status or role.' });
const orgFields = {
  name: orgNameSchema,
  description: orgDescriptionSchema,
  meeting: orgTextSchema,
  location: orgTextSchema,
};
export const clubRequestBody = z.strictObject({
  ...orgFields,
  handle: orgHandleSchema,
  category: z.enum(ClubCategory),
  verificationNote: z.string().trim().min(5).max(500),
});
export const updateClubBody = z.strictObject({
  ...orgFields,
  category: z.enum({ ...ClubCategory, ...PartnerCategory }),
  mark: z.string().trim().min(1).max(4),
  color: z.enum(ClubColor),
});

// All queries share this exact contract; adding an action requires a mapping.
const actionQueries = {
  [CampusAction.Follow]: setCampusFollow,
  [CampusAction.Like]: setCampusLike,
  [CampusAction.Save]: setCampusSave,
  [CampusAction.Rsvp]: setCampusRsvp,
} satisfies Record<CampusAction, typeof setCampusFollow>;

export const getCampus: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const page = res.locals.query as z.infer<typeof pageSchema>;
  const data = await req.db(async tx => {
    const clubs = await getCampusClubs.run(undefined, tx);
    const events = await getCampusEvents.run(undefined, tx);
    const posts = await getCampusPosts.run(page, tx);
    const savedPosts = await getSavedCampusPosts.run(undefined, tx);
    const listings = await getCampusListings.run(undefined, tx);
    return {
      clubs: clubs.map(c => ({
        id: c.id, slug: c.slug, name: c.name, handle: c.handle, mark: c.mark,
        color: c.color, category: c.category, orgType: c.org_type, description: c.description,
        meeting: c.meeting, location: c.location, isSample: c.is_sample,
        followers: c.followers ?? 0, following: !!c.following, canPost: !!c.can_post,
        members: c.members ?? 0,
        membershipStatus: c.membership_status ?? null,
        membershipRole: c.membership_role ?? null,
      })),
      events: events.map(e => ({
        id: e.id, club: e.club, slug: e.slug, title: e.title,
        startsAt: e.starts_at, endsAt: e.ends_at, location: e.location, price: e.price,
        type: e.event_type, poster: e.poster, description: e.description, note: e.note,
        imageUrls: e.image_urls, attending: !!e.attending,
      })),
      posts: posts.map(p => ({
        id: p.id, club: p.club, event: p.event, text: p.text, imageUrls: p.image_urls, createdAt: p.created_at,
        likes: p.likes ?? 0, liked: !!p.liked, saved: !!p.saved,
      })),
      savedPosts: savedPosts.map(p => ({
        id: p.id, club: p.club, event: p.event, text: p.text, imageUrls: p.image_urls, createdAt: p.created_at,
        likes: p.likes ?? 0, liked: !!p.liked, saved: true,
      })),
      listings: listings.map(l => ({
        id: l.id, category: l.category, title: l.title, description: l.description,
        priceJpy: l.price_jpy === null ? null : Number(l.price_jpy),
        location: l.location, isSample: l.is_sample,
      })),
    };
  });
  res.set('Cache-Control', 'private, no-store').json({ data });
};

export const setCampusAction: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { action, id } = res.locals.params as z.infer<typeof campusActionParams>;
  const { active } = res.locals.body as z.infer<typeof campusActionBody>;
  const [result] = await req.db(tx => actionQueries[action].run({ id, active }, tx));
  if (!result?.found) throw notFound('That campus item no longer exists.');
  res.json({ data: { id, active } });
};

export const publishCampusPost: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const body = res.locals.body as z.infer<typeof campusPostBody>;
  const names = extractPhotoNames(body.image_urls);
  const data = await req.db(async tx => {
    const [club] = await getPublishableClub.run({ clubId }, tx);
    if (!club?.internal_id) throw forbidden('You cannot post for this club.');
    await assertOwnsPhotos(names, tx);
    const [post] = await createCampusPost.run({
      clubInternalId: club.internal_id, text: body.text, eventId: body.eventId ?? null, image_urls: body.image_urls,
    }, tx);
    if (!post) throw new HttpError(400, ErrorCode.InvalidData, 'Choose an event belonging to this club.');
    return { id: post.id };
  });
  res.status(201).json({ data });
};

export const publishCampusEvent: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const body = res.locals.body as z.infer<typeof campusEventBody>;
  const names = extractPhotoNames(body.image_urls);
  const data = await req.db(async tx => {
    const [club] = await getPublishableClub.run({ clubId }, tx);
    if (!club?.internal_id) throw forbidden('You cannot create events for this club.');
    await assertOwnsPhotos(names, tx);
    const [event] = await createCampusEvent.run({ ...body, clubInternalId: club.internal_id }, tx);
    return { id: event.id };
  });
  res.status(201).json({ data });
};

export const requestMembership: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const [row] = await req.db(tx => requestClubMembership.run({ clubId }, tx));
  if (!row) throw notFound('Club not found.');
  res.status(201).json({ data: row });
};

export const leaveMembership: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const [row] = await req.db(tx => leaveClubMembership.run({ clubId }, tx));
  if (!row) throw notFound('Membership not found.');
  res.json({ data: row });
};

export const listClubMembers: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const data = await req.db(async tx => {
    const [club] = await getPublishableClub.run({ clubId }, tx);
    if (!club?.internal_id) throw forbidden('You cannot manage members for this club.');
    return getClubMembers.run({ clubId }, tx);
  });
  res.json({ data });
};

export const patchClubMember: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId, memberId } = res.locals.params as z.infer<typeof campusMemberParams>;
  const body = res.locals.body as z.infer<typeof updateMemberBody>;
  const [row] = await req.db(tx => updateClubMember.run({
    clubId, memberId, status: body.status ?? null, role: body.role ?? null,
  }, tx));
  if (!row) throw notFound('Member not found or you cannot manage this club.');
  res.json({ data: row });
};

export const deleteClubMember: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId, memberId } = res.locals.params as z.infer<typeof campusMemberParams>;
  const [row] = await req.db(tx => removeClubMember.run({ clubId, memberId }, tx));
  if (!row) throw notFound('Member cannot be removed.');
  res.json({ data: row });
};

export const submitClubRequest: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const body = res.locals.body as z.infer<typeof clubRequestBody>;
  const [row] = await req.db(tx => createClubRequest.run(body, tx));
  res.status(201).json({ data: row });
};

export const listMyClubRequests: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const data = await req.db(tx => getMyClubRequests.run(undefined, tx));
  res.json({ data });
};

export const updateClub: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const body = res.locals.body as z.infer<typeof updateClubBody>;
  const [updated] = await req.db(tx => editClub.run({ clubId, ...body }, tx));
  if (!updated) throw forbidden('You cannot edit this club.');
  res.json({ data: updated });
};
