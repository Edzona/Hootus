/* @name GetAuthProfile */
select id::text as "internal_id!", public_id, role, full_name
from public.profiles where auth_user_id = :authUserId!;

/* @name GetMyProfile */
select public_id as id, email, student_id, full_name, avatar_url, bio,
role, created_at, updated_at
from public.profiles where public_id = :publicId!;
