# Hootus API

Small Express 5 + TypeScript API. Local development uses `tsx`; Vercel imports
`api/index.ts` without starting a listener. Supabase handles Auth, persistence,
and Realtime. Node 22 or newer is required.

## Run locally

Requires Node 22 or newer and Docker (for local Supabase). The Supabase CLI is a
pinned devDependency of the repository root, so `npx supabase` uses that version.

1. From the repository root, install the CLI and start local Supabase. On a
   fresh database this applies `supabase/migrations/` and `supabase/seed.sql`:

   ```sh
   npm ci
   npx supabase start
   npx supabase status -o env   # API_URL, PUBLISHABLE_KEY (or ANON_KEY), DB_URL
   ```

2. From `backend/`, create `.env` and install:

   ```sh
   npm ci
   cp .env.example .env  # Only if you do not already have .env
   ```

   Fill in `SUPABASE_URL` (`API_URL`), `SUPABASE_PUBLISHABLE_KEY`,
   `CORS_ORIGINS` (comma-separated exact frontend origins, no trailing slashes),
   and `DATABASE_URL`, which must stay on the server. `.env.example` already has
   the local value: the `hootus_server` login, with the well-known local password
   that `supabase/seed.sql` sets on a fresh database.
   Set `SQL_GENERATION_DATABASE_URL` to the status command's `DB_URL`; typed SQL
   generation and integration tests use it. The API needs no service role key.

3. Start the API (default port 5000). `npm run dev` first generates SQL types, so
   the local database must be running with migrations applied:

   ```sh
   npm run dev
   ```

In another terminal, from `frontend/`:

```sh
npm ci
cp .env.example .env  # Only if you do not already have .env
npm run dev
```

Fill in the frontend's Supabase URL and publishable/anon key. Leave
`VITE_API_URL` empty locally: Vite proxies `/api` to port 5000.
Open `http://localhost:5173`.

On macOS, AirPlay may occupy port 5000. In that case set `PORT=5001` in
`backend/.env` and `API_PROXY_TARGET=http://127.0.0.1:5001` in `frontend/.env`.

The signup form calls `/api/auth/signup`. The backend validates the fields and
requests a Supabase email code, passing `full_name` and `student_id` metadata for
the existing profile trigger. Existing emails receive a normal sign-in code, and a
duplicate student ID fails with a generic `AUTH_REQUEST_FAILED` error.
Postgres enforces unique student IDs and case-insensitive unique profile emails.
The "Already registered? Sign in" option only asks for an email and calls
`/api/auth/signin` without trying to create a new account.
The browser verifies the six-digit code with Supabase Auth (`verifyOtp`, type
`email`) in the existing tab. A successful verification opens `#/dashboard`.
Invalid or expired codes stay on the form; users can request another code after
60 seconds or change the email. No redirect URL is accepted by these endpoints.
The private campus card and account details remain available at `#/profile`.

Local email templates are configured in `supabase/config.toml` and
`supabase/templates/sign-in-code.html`. Restart an already-running local stack
with `npx supabase stop` then `npx supabase start` to load them; **do not use
`--no-backup` or reset the database**. Local codes expire after 10 minutes.

For a hosted Supabase project, copy the committed HTML into **Authentication →
Email Templates → Magic Link and Confirm signup**, set email OTP length to six
and expiry to 600 seconds, and keep email confirmation enabled. Local config
files do not update hosted Auth settings. Configure SMTP and production rate
limits there as well. Legacy email links already issued remain supported by the
frontend until they expire.
The waitlist form remains a UI prototype.

### Local sign-in

Submit your email on `#/signup`, read the code from Supabase's local Mailpit inbox
(`MAILPIT_URL` in
`npx supabase status -o env`; `http://127.0.0.1:54324` with the committed config),
and enter it in the same Hootus tab.
`supabase/seed.sql` adds a demo student (`hootus-demo@temple.edu`) for the
sign-in option; on an existing database apply it in the SQL Editor (safe to
rerun, do not reset your database). Keep this fixture out of production.
There is no test sign-in endpoint, demo password, or service-role key in the app.

## Routes

Responses use `{ data: ... }` or `{ error: { code, message, details? } }`.
Health returns `{ status: "ok" }` and checks process liveness only.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health`, `/api/health` | Public |
| POST | `/api/auth/signup` | Public; validated Temple email, name, student ID; requests an email code |
| POST | `/api/auth/signin` | Public; existing-account email-code request |
| GET | `/api/profile/me` | Confirmed Temple user; own profile |
| PATCH | `/api/profile/me` | Confirmed Temple user; own bio (max 500) and photo URL from their own `avatars` folder |
| GET | `/api/listings` | Confirmed Temple user |
| POST | `/api/listings` | Confirmed Temple user |
| GET | `/api/feed` | Confirmed Temple user |
| POST | `/api/feed` | Club leader/admin; perks require admin |
| GET | `/api/campus` | Confirmed Temple user; clubs, events, posts, own saved posts, listing suggestions |
| PUT | `/api/campus/actions/:action/:id` | Confirmed Temple user; idempotent follow/like/save/rsvp, `{ active: boolean }` |
| POST | `/api/campus/clubs/:clubId/posts` | Owning club leader/admin; `{ text, eventId? }` |
| POST | `/api/campus/clubs/:clubId/events` | Owning club leader/admin; event details |

Database tables use internal bigint primary/foreign keys and a unique `public_id`
UUID. API responses expose the record UUID as `id`. Listings and feed posts
contain `author: { name }` only (`name` can be null if not supplied). Other authors'
UUIDs, Auth IDs, email addresses, and student IDs are never included. The signed-in
user's private profile endpoint includes their own profile UUID and account fields.
Future seller actions should submit a listing UUID; the backend resolves the owner.

The browser accesses Supabase Auth, but cannot read or write application tables.
Normal data controllers use ``req.db(tx => tx`...`)`` with parameterized SQL.
`config/database.ts` reuses a small Postgres.js pool, disables prepared statements
for transaction pooling, and scopes `hootus_api` plus the verified Auth UUID to
each transaction. RLS still enforces membership, ownership, and role permissions.
The `hootus_server` login does not inherit table privileges or bypass RLS.
The private `author_name` database function exposes display names only to verified
members; this avoids joining or exposing other people's private profiles.

Application errors use `ErrorCode` from `src/types/errorCode.ts`; the frontend
imports the same dependency-free enum. Shared helpers live in `src/helpers/`.
Use Zod on incoming requests and other trust boundaries, not repeatedly between
internal typed functions. See [AGENTS.md](AGENTS.md) for coding conventions.

List endpoints accept `?limit=20&offset=0` (maximum limit: 100).
All protected calls require `Authorization: Bearer <Supabase access token>`.
The server verifies the token's signature and expiry locally with `getClaims`
(Auth's public signing keys, cached), so a request normally makes no Auth network
call. It then reads the current profile and role from the database on every
request and never trusts metadata roles. Each database transaction uses the
verified Auth user ID; the database rechecks current membership and role. A
revoked session or signed-out user keeps working until its access token expires
(`jwt_expiry`, 1 hour by default); a deleted account or changed role takes effect
immediately because the database is checked each time. The frontend refreshes
tokens automatically.

Example frontend calls, using `src/lib/api.js`:

```js
const profile = await apiRequest('/profile/me')
const listing = await apiRequest('/listings', {
  method: 'POST',
  body: { category: 'sales', title: 'Desk', price_jpy: 1500 },
})
const event = await apiRequest('/feed', {
  method: 'POST',
  body: {
    kind: 'club_event',
    title: 'Board game night',
    room_number: '301',
    meeting_time: '2026-11-01T18:00:00+09:00',
  },
})
```

Register every route module in `src/routes/index.ts`. Its `protectedRoutes`
router runs `requireAuth` for all student-facing modules. Child routers only
need `requireRole` for narrower permissions and `validate` for input.
Validation supports body, query, and params; parsed values are in
`res.locals.body/query/params`. In a controller, call `assertAuthenticated(req)`
to narrow the optional `req.user` and `req.db` fields before using them.
Express 5 forwards rejected async handlers to the shared error handler.

## Check

### Logging

Logging uses `debug` through `src/helpers/logger.ts`. Set `DEBUG=hootus:*`
in `backend/.env` locally or in Vercel environment variables to enable all app
logs. Use `DEBUG=hootus:warn,hootus:error` for warnings and errors only; leave
DEBUG unset or empty to disable logs. Avoid `DEBUG=*`, which also enables
third-party library logs outside our redaction rules.

The first middleware writes one JSON request record with a debug namespace
prefix to stderr when its namespace is enabled.
It includes timestamp, severity, a generated request ID, method, route template,
status, duration, and a safe error code when available. `X-Request-Id` is returned
to clients and exposed through CORS so failures can be correlated with logs.

Request bodies, query strings, auth headers, cookies, user details, and raw
exception messages are not logged. Unmatched requests and rejections before
route selection use `[unmatched]`; aborted requests use status 499 in logs only.
Keep router mount paths static so route templates remain free of user data.
Enabled logs appear in the local terminal and the function's runtime logs on
Vercel. Request IDs are returned even with logging disabled. Disabled namespaces
skip JSON formatting. `debug` controls output; it does not make stderr writes
inherently asynchronous. Node's I/O behavior depends on the platform and output
destination. See [debug](https://github.com/debug-js/debug) and
[Node process I/O](https://nodejs.org/api/process.html#a-note-on-process-io).

### Tests

```sh
npm run build
npm test
npm run test:integration
```

Tests are split by feature into `auth`, `profile`, `listings`, `feed`, and
`campus` files. HTTP behavior, domain validation, database access, and logging
have separate files. Shared setup and fixture cleanup live in `tests/helpers/`.
To run one feature against local Supabase, use, for example:

```sh
RUN_INTEGRATION=1 node --import tsx --test tests/campus.test.ts
```

The integration tests require local Supabase with all migrations applied,
`SQL_GENERATION_DATABASE_URL` in `.env`, and `[auth.email].enable_confirmations`
left disabled (as committed) so test accounts sign up with a session. It also
reads the sign-up email from Mailpit. It creates temporary accounts, checks auth, validation, role changes, minimal
responses, direct-browser table denial, pooled identity isolation and rollback,
then deletes those accounts and their dependent rows. It rejects remote
Supabase URLs. `npm test` only runs the checks that do not require Supabase.

## Vercel

The root `vercel.json` deploys the Vite frontend and Express backend as two
services in one Vercel project. `/api` requests go to the backend; other paths
go to the frontend. Leave `VITE_API_URL` empty for this setup. Set the Supabase
variables for the deployment's target environment: Production variables are
not available to Preview deployments automatically.

The backend service uses `src/app.ts` with `outputDirectory: "."` so Vercel
compiles the source and retains its package context. Selecting the standalone
`tsc` output can move `src/app.js` outside the backend's `type: module` package
and cause `Cannot use import statement outside a module` at runtime.
`.vercelignore` excludes local environment files, database runtime secrets,
development caches and demo documentation from deployment uploads.

Apply all repository migrations to hosted Supabase before using the API. Do not
push the local seed. The migrations create `hootus_server` without a password;
provision a separate password for that login, then use
`hootus_server.PROJECT_REF` with the hosted transaction pooler in `DATABASE_URL`.
Set `CORS_ORIGINS` to the exact frontend HTTPS origin. Keep database credentials
server-only and redeploy after changing environment variables.

Hosted connections use Postgres.js `ssl: 'require'`: traffic is encrypted, but
the server certificate is not verified. No custom CA configuration is needed.

Alternatively, use two separate Vercel projects from this repository:

1. **Backend:** Root Directory `backend`, Framework Preset **Other**, Node 22 or
   newer, Build Command `npm run build`, Output Directory `public`. The included
   configuration rewrites requests to the `api/index.ts` function while Express
   routes retain their original paths. Set `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, and `CORS_ORIGINS`
   in Vercel. The API does not use a service-role key; do not set one. `CORS_ORIGINS` must include the frontend's HTTPS origin.
   Use the Supabase **transaction pooler** host/port from the Connect dialog,
   with username `hootus_server.PROJECT_REF`. The migration creates this role
   without a password; set a unique one in the hosted SQL Editor
   (`alter role hootus_server password '...'`) and keep it out of the repository.
   Hosted connections require encrypted TLS. Keep this credential out of frontend
   environments; the default `postgres` login is deliberately rejected.
2. **Frontend:** Root Directory `frontend`, Framework Preset **Vite**. Set
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` to
   the backend's HTTPS origin (without `/api`). These variables are build-time
   values; redeploy after changes. Enable **Include source files outside of the
   Root Directory in the Build Step** so Vite can import the shared error enum
   from `backend/src/types/errorCode.ts`. This module contains no configuration
   or secrets.
3. Use a hosted Supabase project for deployment and apply the migration there.
   Add the frontend HTTPS origin to Supabase Auth's redirect allowlist and Site
   URL. Configure exact preview origins separately when using preview deployments.

Vercel cannot connect to the Supabase instance on your laptop's `127.0.0.1`.
Raw Realtime table subscriptions are deliberately unavailable to browser roles.
The messages table remains in the publication, but its table grants are revoked.
Messaging needs an authorized API and a separate minimal notification contract;
do not re-enable table access to make raw subscriptions work. This scaffold does
not include marketplace UI screens, uploads, message endpoints, or a deployment.

Email-confirmation setup is deferred for now. Before production, enable Confirm
Email in hosted Supabase Auth. Local confirmation can be tested with the local
mail inbox after enabling `[auth.email].enable_confirmations` and restarting the
stack. The current local config still has confirmations disabled.

References: [Vercel Express](https://vercel.com/docs/frameworks/backend/express),
[Supabase token verification](https://supabase.com/docs/reference/javascript/auth-getclaims),
[email-code requests](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

## Typed SQL

Keep named queries in `../supabase/queries/`. PgTyped reads the **running local
schema**, validates SQL, and generates parameter/result types in `src/generated/`.
Apply schema changes locally before generating. Commit both SQL and generated files.

```sh
npm run sql:generate  # uses local SQL_GENERATION_DATABASE_URL from .env
npm run dev           # generates once, then starts the API with hot reload
npm run sql:watch     # optional second terminal while editing SQL
npm run check         # stale generation check, TypeScript build and tests
```

Generation uses a separate local-only database URL (see `.env.example`). The API
continues to use its restricted `DATABASE_URL`, transactions, and RLS. Vercel only
runs `npm run build`; it does not generate types or need the local tooling URL.
PgTyped parameterizes query values; it does not replace Zod or authorization.
TypeScript is pinned to 5.9 because PgTyped CLI currently declares support through 5.

## Campus communities

Apply the new `20261022085736_campus_communities.sql` migration after the initial
schema; do not reset an existing database. All application access remains behind
`requireAuth` and transaction-local `hootus_api` RLS. Club publishing checks the
club's assigned leader as well as the current profile role. Event attachments
must belong to the same club. API IDs are public UUIDs.

`GET /api/campus?limit=100&offset=0` returns `clubs`, `events`, `posts`,
`savedPosts`, and `listings`. Feed paging uses the existing 1–100 limit;
club/event directories and saved posts are currently capped at 100, and listing
suggestions at six. Saved posts are fetched separately so they do not disappear
when they fall outside the recent feed. Account-specific responses use
`Cache-Control: private, no-store`.

`PUT /api/campus/actions/:action/:id` accepts `follow`, `like`, `save`, or
`rsvp`, and a strict `{ "active": true|false }` body. Repeated requests do not
create duplicate relationships. User identity comes from the authenticated
transaction, never a request field. Save/follow/like/RSVP rows are private to the
owner; two private functions expose only aggregate follower and like counts to
confirmed campus members. Browser table/sequence privileges remain revoked.

Event creation takes `title`, `starts_at`, `ends_at`, `location`, `event_type`,
and optional `price`, `poster`, `description`, and `note`. Timestamps must include
a timezone and the end must follow the start. Poster styles are `film`, `photo`,
and `outdoor`. There is no capacity limit, ticket purchase, or event-management
UI in this version.

For local development, run `npm run db:seed` after migrations. The runner refuses
non-local database hosts and uses `SQL_GENERATION_DATABASE_URL`; it is never a
production seed command. The repeatable seed adds five sample clubs, three
events, five posts, and three listings, along with the local accounts:

- `hootus-demo@temple.edu`: student Hana Tanaka, following Film and Outdoor clubs.
- `hootus-clubs@temple.edu`: club leader assigned to the five sample clubs.

Use the existing email sign-in form and follow the link in local Mailpit. No
password is set for either account. These are illustrative fixtures, not verified
TUJ organization or housing records. The browser checks for updates every 15
seconds while visible, and queues new posts behind a Show updates button. This
is authenticated API polling, not a Supabase Realtime subscription.
