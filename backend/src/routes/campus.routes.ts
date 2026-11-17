import { Router } from 'express';
import { pageSchema } from '../helpers/validation.js';
import { validate } from '../middleware/validate.js';
import {
  getCampus, setCampusAction, publishCampusPost, publishCampusEvent,
  requestMembership, leaveMembership, listClubMembers, patchClubMember, deleteClubMember,
  submitClubRequest, listMyClubRequests, updateClub,
  campusActionParams, campusActionBody, campusClubParams, campusPostBody, campusEventBody,
  campusMemberParams, updateMemberBody, clubRequestBody, updateClubBody,
} from '../controllers/campus.controller.js';

export const campusRoutes = Router();

campusRoutes.get('/', validate(pageSchema, 'query'), getCampus);
campusRoutes.put('/actions/:action/:id', validate(campusActionParams, 'params'), validate(campusActionBody), setCampusAction);
// Club-level manager permission is enforced inside the controller & Postgres RLS (supports promoted managers).
campusRoutes.patch('/clubs/:clubId', validate(campusClubParams, 'params'), validate(updateClubBody), updateClub);
campusRoutes.post('/clubs/:clubId/posts', validate(campusClubParams, 'params'), validate(campusPostBody), publishCampusPost);
campusRoutes.post('/clubs/:clubId/events', validate(campusClubParams, 'params'), validate(campusEventBody), publishCampusEvent);
campusRoutes.post('/clubs/:clubId/membership', validate(campusClubParams, 'params'), requestMembership);
campusRoutes.delete('/clubs/:clubId/membership', validate(campusClubParams, 'params'), leaveMembership);
campusRoutes.get('/clubs/:clubId/members', validate(campusClubParams, 'params'), listClubMembers);
campusRoutes.patch('/clubs/:clubId/members/:memberId', validate(campusMemberParams, 'params'), validate(updateMemberBody), patchClubMember);
campusRoutes.delete('/clubs/:clubId/members/:memberId', validate(campusMemberParams, 'params'), deleteClubMember);
campusRoutes.get('/club-requests', listMyClubRequests);
campusRoutes.post('/club-requests', validate(clubRequestBody), submitClubRequest);
