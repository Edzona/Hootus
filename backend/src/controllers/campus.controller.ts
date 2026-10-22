import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  getCampusClubs, getCampusEvents, getCampusPosts, getSavedCampusPosts, getCampusListings,
  setCampusFollow, setCampusLike, setCampusSave, setCampusRsvp,
  getPublishableClub, createCampusPost, createCampusEvent,
} from '../generated/campus.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { pageSchema } from '../helpers/validation.js';
import { CampusAction } from '../types/domain.js';
import { ErrorCode } from '../types/errorCode.js';

export const campusActionParams = z.strictObject({ action: z.enum(CampusAction), id: z.uuid() });
export const campusActionBody = z.strictObject({ active: z.boolean() });
export const campusClubParams = z.strictObject({ clubId: z.uuid() });
export const campusPostBody = z.strictObject({
  text: z.string().trim().min(1).max(10000),
  eventId: z.uuid().optional(),
});
export const campusEventBody = z.strictObject({
  title: z.string().trim().min(1).max(200),
  starts_at: z.iso.datetime({ offset: true }),
  ends_at: z.iso.datetime({ offset: true }),
  location: z.string().trim().min(1).max(300),
  price: z.string().trim().min(1).max(100).default('Free entry'),
  event_type: z.string().trim().min(1).max(80),
  poster: z.enum(['film', 'photo', 'outdoor']).default('film'),
  description: z.string().trim().max(10000).default(''),
  note: z.string().trim().max(1000).default(''),
}).refine(event => Date.parse(event.ends_at) > Date.parse(event.starts_at), {
  message: 'End time must be after start time.', path: ['ends_at'],
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
        color: c.color, category: c.category, description: c.description,
        meeting: c.meeting, location: c.location, isSample: c.is_sample,
        followers: c.followers ?? 0, following: !!c.following, canPost: !!c.can_post,
      })),
      events: events.map(e => ({
        id: e.id, club: e.club, slug: e.slug, title: e.title,
        startsAt: e.starts_at, endsAt: e.ends_at, location: e.location, price: e.price,
        type: e.event_type, poster: e.poster, description: e.description, note: e.note,
        attending: !!e.attending,
      })),
      posts: posts.map(p => ({
        id: p.id, club: p.club, event: p.event, text: p.text, createdAt: p.created_at,
        likes: p.likes ?? 0, liked: !!p.liked, saved: !!p.saved,
      })),
      savedPosts: savedPosts.map(p => ({
        id: p.id, club: p.club, event: p.event, text: p.text, createdAt: p.created_at,
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
  if (!result?.found) throw new HttpError(404, ErrorCode.NotFound, 'That campus item no longer exists.');
  res.json({ data: { id, active } });
};

export const publishCampusPost: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const body = res.locals.body as z.infer<typeof campusPostBody>;
  const data = await req.db(async tx => {
    const [club] = await getPublishableClub.run({ clubId }, tx);
    if (!club?.internal_id) throw new HttpError(403, ErrorCode.Forbidden, 'You cannot post for this club.');
    const [post] = await createCampusPost.run({ clubInternalId: club.internal_id, text: body.text, eventId: body.eventId ?? null }, tx);
    if (!post) throw new HttpError(400, ErrorCode.InvalidData, 'Choose an event belonging to this club.');
    return { id: post.id };
  });
  res.status(201).json({ data });
};

export const publishCampusEvent: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { clubId } = res.locals.params as z.infer<typeof campusClubParams>;
  const body = res.locals.body as z.infer<typeof campusEventBody>;
  const data = await req.db(async tx => {
    const [club] = await getPublishableClub.run({ clubId }, tx);
    if (!club?.internal_id) throw new HttpError(403, ErrorCode.Forbidden, 'You cannot create events for this club.');
    const [event] = await createCampusEvent.run({ ...body, clubInternalId: club.internal_id }, tx);
    return { id: event.id };
  });
  res.status(201).json({ data });
};
