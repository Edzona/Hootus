// Shared wire values for clubs, partners and memberships. Also imported by the
// frontend, so keep this module free of server and validation dependencies.
export enum ClubCategory {
  ArtsCulture = 'Arts & culture',
  Outdoors = 'Outdoors',
  Careers = 'Careers',
  Music = 'Music',
  Academic = 'Academic',
  Sports = 'Sports',
  Other = 'Other',
}

export enum PartnerCategory {
  RealEstate = 'Real estate',
  LocalBusiness = 'Local business',
  CampusPartner = 'Campus partner',
  Other = 'Other',
}

export enum ClubColor {
  Plum = 'plum',
  Forest = 'forest',
  Blue = 'blue',
  Gold = 'gold',
  Rose = 'rose',
}

export enum EventPoster {
  Film = 'film',
  Photo = 'photo',
  Outdoor = 'outdoor',
}

export enum MemberRole {
  Member = 'member',
  Manager = 'manager',
}

export enum ReviewStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export const clubCategories: string[] = Object.values(ClubCategory);
export const partnerCategories: string[] = Object.values(PartnerCategory);
// Club managers may pick any category; "Other" exists in both lists.
export const allCategories: string[] = [...new Set([...clubCategories, ...partnerCategories])];
