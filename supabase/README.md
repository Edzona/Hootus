# Supabase foundation

Initial schema for the React frontend in `frontend/` and Express API in
`backend/`. See [backend setup](../backend/README.md) for authentication and
local/Vercel configuration.

Apply `migrations/20261020000000_initial_schema.sql` once in a fresh Supabase
project's SQL Editor as the database owner. It runs in a transaction. It assumes
Supabase's `auth.users`, `auth.uid()` and database roles already exist.
Existing Auth users are not backfilled; add a separate migration if importing
an existing project.

This early-stage schema is consolidated into one initial migration. It is for
fresh databases, not an upgrade script for the old UUID-primary-key schema.
Profile emails are unique case-insensitively, and student IDs remain unique.

Each application table has an internal `bigint generated always as identity`
primary key and a unique public UUID (`public_id`). Foreign keys use internal
IDs. `profiles.auth_user_id` links to Supabase Auth's UUID. The backend maps
public IDs to API `id` fields and never exposes numeric keys in HTTP responses.

`seed.sql` contains the repeatable local demo student (Hana Tanaka,
`hootus-demo@temple.edu`, student ID `900000001`). It is configured to run after
migrations on a fresh local database. For an existing local database, run it
in the local SQL Editor. It adds data without resetting the database and can
be run twice safely. Do not apply this local-only seed to production.

Run `tests/access_control.sql` as the database owner in a disposable project's
SQL Editor after applying the migration. It checks signup/domain enforcement,
role escalation, ownership, feed permissions, message privacy, unconfirmed and
anonymous access, and publication membership; fixtures roll back. This does not
test live WebSocket delivery, which requires a connected client.

## Data and permissions

All application-table access goes through the backend. The browser's `anon`
and `authenticated` roles have no table or sequence privileges, even for an admin
user. The server login `hootus_server` can assume the restricted `hootus_api`
role inside a transaction. Neither role bypasses RLS. The API sets the verified
Auth UUID transaction-locally; policies require a confirmed `@temple.edu` email. Signup and subsequent Auth email changes reject other domains. Keep email
confirmation enabled in Supabase Auth.

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | Own profile; admins can read all | Own name, student ID, avatar and bio |
| `listings` | All members | Members create their own; owner/admin edit or delete |
| `feed_posts` | All members | Club leaders manage their own events; admins manage events and perks |
| `messages` | Sender and recipient only, including for admins | Send as yourself; no client editing/deletion |

The table above describes backend operations under RLS, not direct browser access.

Role assignment is a trusted operation through the SQL Editor or a server using
the service role. Never put the service role key in the frontend. For example:

```sql
update public.profiles
set role = 'club_leader'
where auth_user_id = '<auth-user-uuid>';
```

Every signup starts as `student`, regardless of user-supplied role metadata.
The trigger accepts `full_name` (or `name`) and `student_id` (or the form's
`studentId`) from signup metadata. Student IDs are unique nine-digit strings,
nullable for OAuth onboarding, and self-reported rather than enrollment-verified.
Email and student ID stay private through profile RLS; a public author directory
can be added separately later.

Listings use `sales`, `housing`, or `gigs`; `price_jpy` stores whole yen, with
`NULL` for unspecified/negotiable prices and `0` for free items. Image URLs are
arrays; storage buckets and upload policies are a separate future step.
Events require a room and `meeting_time` (send an ISO timestamp with an offset,
such as `2026-11-01T18:00:00+09:00`). Perks require a business name and may have a
coupon code and expiry.

## Server credentials and deployment

The initial schema creates `hootus_api` (NOLOGIN) and `hootus_server` (LOGIN,
NOINHERIT), both NOBYPASSRLS. It contains no password. Local development gets a
well-known password from `seed.sql`. For a hosted project, set a unique password
as the database owner (SQL Editor or a trusted admin `psql` session: run
`\password hootus_server` to be prompted).
Store its connection string only in the backend's `DATABASE_URL` environment
variable. Hosted deployments use Supabase's transaction pooler and verified TLS;
the username is `hootus_server.PROJECT_REF`. Never grant this role to browser
roles or PostgREST's `authenticator`.

The local running schema has been updated without deleting existing records.
The consolidated initial migration is still intended for a fresh project.

## Realtime messages

`messages` remains in `supabase_realtime`, but browser roles cannot select the
table, so raw Postgres Changes events are not available to them. A future
messaging API must check participants and return only necessary fields; a
separate authorized notification channel should publish minimal payloads.
Do not restore browser table grants or send raw database rows to the frontend.
Messages currently store plain text, not application-layer encrypted content.

References: [Auth profile triggers](https://supabase.com/docs/guides/auth/managing-user-data),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Campus schema and fixtures

`migrations/20261022085736_campus_communities.sql` is an additive upgrade after
the initial migration. It adds clubs, club events/posts, and private follow,
like, save, and RSVP relationships. It also labels seeded listings with
`is_sample`. Primary keys remain internal bigints with public UUIDs at the API.
All seven new tables enable RLS, revoke browser access, and index foreign keys.
Only a club's assigned leader or an admin can publish on its behalf.

The two `private.club_*_count` functions deliberately use SECURITY DEFINER to
return aggregate counts without exposing other students' relationship rows.
They check current confirmed membership, fix `search_path`, and grant execution
only to `hootus_api`. They return no user identities or private profile fields.

The local-only `seed.sql` now includes five illustrative clubs, three events,
five posts, and three marketplace/housing listings. It creates a separate sample
club leader (`hootus-clubs@temple.edu`); Hana remains a student. Stable UUIDs and
`ON CONFLICT DO NOTHING` keep content repeatable without overwriting records.
From `backend/`, run `npm run db:seed` to seed an existing local database without
resetting it. Never run this seed on a hosted project: it provisions local Auth
fixtures and a well-known local server-role password.
