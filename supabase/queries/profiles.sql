/* @name GetAuthProfile */
select id::text as "internal_id!", public_id, email, role, full_name
from public.profiles where auth_user_id = :authUserId!;

/* @name GetMyProfile */
select public_id as id, email, student_id, full_name, avatar_url, bio,
role, created_at, updated_at
from public.profiles where public_id = :publicId!;

/* @name UpdateMyProfile */
update public.profiles set
  bio = case when :setBio!::boolean then :bio::text else bio end,
  avatar_url = case when :setAvatar!::boolean then :avatarUrl::text else avatar_url end
where public_id = :publicId!
returning public_id as id, email, student_id, full_name, avatar_url, bio,
role, created_at, updated_at;
