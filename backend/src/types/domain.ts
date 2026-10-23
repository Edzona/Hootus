import { z } from 'zod';
export { CampusAction } from './campusAction.js';

// Values are part of the database/API contract. Keep them stable.
export enum UserRole {
  Student = 'student',
  ClubLeader = 'club_leader',
  Admin = 'admin',
}

export enum ListingCategory {
  Sales = 'sales',
  Housing = 'housing',
  Gigs = 'gigs',
}

export enum FeedPostKind {
  ClubEvent = 'club_event',
  Perk = 'perk',
}

export const userRoleSchema = z.enum(UserRole);
export const listingCategorySchema = z.enum(ListingCategory);
