# Hootus API

Small Express 5 + TypeScript API. Local development uses `tsx`; Vercel imports
`api/index.ts` without starting a listener. Supabase handles Auth, persistence,
and Realtime. Node 22 or newer is required.

## Run locally

From `backend/`:

```sh
npm ci
cp .env.example .env  # Only if you do not already have .env
npm run dev
```

Fill in `.env` using your local Supabase URL, publishable (or legacy anon) key,
and service role key. Both the service role key and `DATABASE_URL` must stay
on the server. Apply the schema, then use a trusted admin `psql` session to set
the dedicated login's password with `\password hootus_server` (interactive prompt;
do not put the password in migrations or shell history). Set the local URL to
`postgresql://hootus_server:URL_ENCODED_PASSWORD@127.0.0.1:54322/postgres`.
The current local workspace already has this login configured in ignored `.env`.
`CORS_ORIGINS` is a comma-separated list of exact frontend origins, without
trailing slashes. The default API port is 5000.

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

The signup form calls `/api/auth/signup`. The backend validates the fields,
checks student ID conflicts, and requests a Supabase magic link, passing
`full_name` and `student_id` metadata for the existing profile trigger.
Duplicate IDs return HTTP 409 with code `STUDENT_ID_IN_USE`; the form displays
the message under Student ID. Existing emails return HTTP 409 `EMAIL_IN_USE`,
shown under Email, including when a different student ID is submitted.
Postgres enforces unique student IDs and case-insensitive unique profile emails.
The "Already registered? Sign in" option only asks for an email and calls
`/api/auth/signin` without trying to create a new account.
Supabase must allow `http://localhost:5173` and `http://127.0.0.1:5173` as Auth
redirect URLs. These are included in `supabase/config.toml`; an already-running
local Supabase stack must be restarted to load config changes. Local Auth emails
appear in Supabase's local mail inbox rather than a real mailbox.
After following the link, the frontend opens `#/profile`, loads
`/api/profile/me`, and shows a private campus card and account details.
The waitlist form remains a UI prototype.

### Test sign-in (local only)

The demo student is seeded by `supabase/seed.sql` after migrations on a fresh
local database (already configured in `supabase/config.toml`). For an existing
local database, apply that SQL file in its SQL Editor; it is safe to rerun.
Do not reset your database just to seed it. Keep this fixture out of production.

Set `ENABLE_TEST_SIGNIN=true` in `backend/.env`, then restart the backend if it
was already running.
Open `#/signup` and click **Test sign in** to view the profile without email.

The button only exists in Vite development mode. The backend endpoint requires
`ENABLE_TEST_SIGNIN=true`, development mode, a loopback Supabase URL, a loopback
request, and a dedicated test account with the `student` role. It is disabled
on Vercel and in production. The endpoint verifies the seeded account before
issuing a one-time email token internally and exchanging it for a normal session.
There is no demo password or user-creation script.

## Routes

Responses use `{ data: ... }` or `{ error: { code, message, details? } }`.
Health returns `{ status: "ok" }` and checks process liveness only.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health`, `/api/health` | Public |
| POST | `/api/auth/signup` | Public; validated Temple email, name, student ID, allowed redirect |
| POST | `/api/auth/signin` | Public; existing-account email sign-in |
| POST | `/api/auth/test-signin` | Opt-in local development only |
| GET | `/api/profile/me` | Confirmed Temple user; own profile |
| GET | `/api/listings` | Confirmed Temple user |
| POST | `/api/listings` | Confirmed Temple user |
| GET | `/api/feed` | Confirmed Temple user |
| POST | `/api/feed` | Club leader/admin; perks require admin |

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
The server verifies the token with Auth and reads the current database role on
every request. It never trusts metadata roles. Each database transaction uses
the verified Auth user ID; the database rechecks current membership and role.

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

The integration test requires local Supabase with the initial migration applied.
It creates temporary accounts, checks auth, validation, role changes, minimal
responses, direct-browser table denial, pooled identity isolation and rollback,
then deletes those accounts and their dependent rows. It rejects remote
Supabase URLs. `npm test` only runs the checks that do not require Supabase.

## Vercel

Use two Vercel projects from this repository:

1. **Backend:** Root Directory `backend`, Framework Preset **Other**, Node 22 or
   newer, Build Command `npm run build`, Output Directory `public`. The included
   configuration rewrites requests to the `api/index.ts` function while Express
   routes retain their original paths. Set `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `CORS_ORIGINS`
   in Vercel. `CORS_ORIGINS` must include the frontend's HTTPS origin.
   Use the Supabase **transaction pooler** host/port from the Connect dialog,
   with username `hootus_server.PROJECT_REF` and the dedicated role's password.
   Hosted connections require verified TLS. Keep this credential out of frontend
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
[Supabase token verification](https://supabase.com/docs/reference/javascript/auth-getuser),
[email-link sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

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
Existing trusted Auth administration uses Supabase's client and is outside PgTyped.
TypeScript is pinned to 5.9 because PgTyped CLI currently declares support through 5.
