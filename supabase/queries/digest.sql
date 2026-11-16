/* @name ClaimDigests */
-- Server job only: claims members with new activity and advances their digest window.
select profile_id as "profile_id!", email as "email!", full_name, since as "since!",
  total as "total!", listings as "listings!", club_posts as "club_posts!", offers as "offers!"
from private.claim_digests(:batch!::int);

/* @name RevertDigest */
select private.revert_digest(:id!::uuid, :since!::timestamptz) as "reverted!";

/* @name SetEmailDigestByToken */
select private.set_email_digest(:id!::uuid, :enabled!::boolean) as "found!";
