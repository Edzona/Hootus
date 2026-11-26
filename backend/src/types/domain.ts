export { CampusAction } from './campusAction.js';
export {
  ClubCategory, PartnerCategory, ClubColor, EventPoster, MemberRole, ReviewStatus,
} from './clubOptions.js';

// Values are part of the database/API contract. Keep them stable.
export enum UserRole {
  Student = 'student',
  ClubLeader = 'club_leader',
  Partner = 'partner',
  Admin = 'admin',
  Moderator = 'moderator',
}

export enum ListingCategory {
  Sales = 'sales',
  Housing = 'housing',
  Gigs = 'gigs',
}

export enum ListingStatus {
  Active = 'active',
  Sold = 'sold',
  Closed = 'closed',
}

export enum FeedPostKind {
  ClubEvent = 'club_event',
  Perk = 'perk',
}

export enum ModerationTarget {
  Listing = 'listing',
  FeedPost = 'feed_post',
  ClubPost = 'club_post',
}

export enum ReportStatus {
  Open = 'open',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

export enum ReportAssignment {
  Me = 'me',
  Unassigned = 'unassigned',
}
