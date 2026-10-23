# Backend guide

## Local skills

Follow the repository's `../AGENTS.md`. Inspect both `./.agents/skills/`
(backend-only skills) and `../.agents/skills/` (repository skills) before work.
Read the relevant `SKILL.md` files and their applicable references.

For backend implementation and reviews, load:

- [Backend development guidelines](.agents/skills/backend-dev-guidelines/SKILL.md):
  request handling, validation, configuration, error boundaries, and testing.
- [Coding standards](.agents/skills/cc-skill-coding-standards/SKILL.md):
  readability, TypeScript safety, KISS, DRY, and avoiding speculative abstractions.

Before Supabase work, also read
`../.agents/skills/supabase/SKILL.md`; for schema, SQL, indexes, or RLS, also read
`../.agents/skills/supabase-postgres-best-practices/SKILL.md`.
Use the applicable reference guides during reviews and report concrete gaps
and verification results. Do not apply unrelated skill recommendations.

Apply these skills within the user's explicit simplicity and stack choices.
Do not introduce Prisma, mandatory service/repository layers, BaseController,
dependency-injection frameworks, Sentry, or redundant async wrappers solely
because a skill prescribes them. Keep Express 5's error propagation, the existing
error response contract, `debug` logging, and shared enum conventions. Skill
examples using console logging or string error codes do not override those choices.

## Setup

Express 5 + TypeScript, Supabase Auth/Postgres, Vercel function entrypoint
`api/index.ts`. `src/server.ts` is for local development only.
Run `npm ci`, configure `.env` from `.env.example`, then `npm run dev`.
The frontend uses a Vite `/api` proxy locally. On Vercel the exported Express
app runs as a Node serverless function; do not call `listen()` in `api/index.ts`.
Application data flows frontend → API → Postgres. The browser uses Supabase
only for Auth; do not grant browser roles application-table access.

## Routes and auth

- Register every API module in `src/routes/index.ts`; keep the route list in
  `README.md` current.
- Put student-facing modules under `protectedRoutes`. This shared router is
  the auth shell: it runs `requireAuth` once for all child routes.
- Keep genuinely public routes, such as health and signup, outside that shell.
- Add `requireRole(...)` only where a route needs narrower role permissions.
- Controllers call `assertAuthenticated(req)` for typed `req.user` and `req.db`.
  Use `req.db(tx => generatedQuery.run(params, tx))` for user data. It opens a short transaction,
  sets the restricted `hootus_api` role and verified Auth UUID locally, and
  commits or rolls back before returning. Never use session-level SET for user
  identity, and never trust a user ID from the request body as the caller.
- Use Zod at trust boundaries: incoming HTTP bodies, query strings, params,
  environment variables, and untrusted external data. Validate UUID inputs with
  `z.uuid()`. Read parsed HTTP input from `res.locals.body/query/params`.
  Do not revalidate already-validated data between internal backend functions;
  use TypeScript types there. Derive ownership from `req.user`, not input.
- Return `{ data }` on success and use `HttpError` for expected failures.
  Map conflicts to useful 409 errors; never send raw database errors to clients.
- Use `debug` via `src/helpers/logger.ts`, never `console.*` for application
  logging. Namespaces are `hootus:info`, `hootus:warn`, and `hootus:error`.
  Enable them with `DEBUG=hootus:*` or select individual namespaces. Logging
  is disabled when DEBUG is unset; set it explicitly on Vercel when needed.
- Request logging is centralized in `requestLogger`. Use its `X-Request-Id`
  to trace failures. Do not add body/header/query logging or raw error dumps.
  Skip formatting when a namespace is disabled. `debug` uses stderr; it does
  not guarantee asynchronous I/O.

## Data and secrets

- Database primary/foreign keys are internal `bigint` IDs. Each app table has
  a unique `public_id` UUID. API record IDs contain public UUIDs only; never
  return internal IDs, raw database rows, or unnecessary relationship IDs.
  Listing/feed responses expose only `author: { name }`, not author UUIDs,
  Auth IDs, emails, or student IDs. Resolve owners server-side from a listing
  UUID when implementing actions such as messaging.
  Resolve incoming UUIDs inside `req.db` so RLS still applies.
  Cast bigint IDs to text when reading them into JS to avoid precision loss.
- Supabase Auth keeps UUIDs: `profiles.auth_user_id` links to `auth.users.id`.
  `req.user.id` is the public profile UUID; `req.user.internalId` is server-only.
- Keep email and student ID uniqueness enforced in Postgres as well as signup.
- Put local sample data in `../supabase/seed.sql`, not ad-hoc user-creation scripts.
  Keep seed data repeatable and separate from schema migrations.
- `DATABASE_URL` is server-only and must use the `hootus_server` login, never
  `postgres` or another owner/superuser. In production use the Supabase
  transaction pooler with TLS. Both server roles have NOBYPASSRLS; do not grant
  either role to `authenticated`, `anon`, or PostgREST's `authenticator`.
- Reuse the small module-level Postgres.js pool; keep `prepare: false` for
  transaction pooling. Only `withUser` opens user transactions. Keep external
  HTTP calls outside transactions. Parameterize all SQL; never concatenate
  request values into SQL. The API holds no service-role key; integration tests use the local owner
  `SQL_GENERATION_DATABASE_URL` for fixtures and read sign-in codes from Mailpit.
- Raw Realtime table events are not a frontend contract. Browser table grants
  stay revoked; implement authorized, minimal messaging payloads separately.
- Never commit `.env`, expose service-role keys in browser code, print tokens,
  or return secrets in errors. Only public Supabase keys belong in `VITE_*`.
- Do not add test-only sign-in routes; test locally through real email codes in Mailpit.

## Style and tests

- Keep code small and direct: route → middleware → controller → parameterized SQL.
  Reuse the shared auth/validation helpers; avoid unnecessary service layers,
  factories, classes, or abstractions.
- Use strict TypeScript, explicit imports, single quotes, and semicolons.
- Order files as **imports → data → reusable helper functions → main entry logic**.
  Data includes types, enums, constants, schemas, and instance declarations.
  Main logic includes route registration, exported handlers/middleware, and startup.
  Skip sections that are not needed; do not add empty sections or banner comments.
- Put cross-file reusable functions in `src/helpers/` and import them:
  `auth.ts` for typed auth assertions, `errors.ts` for HTTP/database errors,
  `logger.ts` for debug logging. Shared Zod schemas live in
  `helpers/validation.ts`; transaction setup lives in `config/database.ts`. Keep file-local reusable helpers local.
- Extract a helper only when it removes repeated logic. Keep one-off checks
  inline and delete unnecessary wrappers. Framework handlers, middleware factories,
  and lifecycle callbacks still need functions; keep them near their entry logic.
  Declare shared state before callbacks and execute setup after helper definitions.
- Use shared string enums in `src/types/domain.ts` for fixed business values
  (roles, listing categories, feed kinds). Do not repeat raw strings or replace
  enums with type assertions. Keep enum values compatible with the API and DB.
- All application error codes use `ErrorCode` in `src/types/errorCode.ts`.
  This dependency-free module is also imported by the frontend; do not duplicate
  wire strings. `HttpError` requires the enum. Third-party error codes remain
  external protocol strings and are translated at the boundary. Rename enum
  members freely but keep serialized values stable unless changing the API.
- Build Zod validation from the enums (`z.enum(UserRole)`,
  `z.literal(FeedPostKind.ClubEvent)`) and validate untrusted values before use.
- Cover every enum case: use `Record<Enum, Value>` for simple data mappings, or
  an exhaustive `switch` with a `never` check for branching logic. Do not create
  a one-use helper just to wrap a switch. Adding a case requires updating its
  validation, behavior, and tests. Do not create enums for arbitrary text,
  URLs, or third-party protocol values.
- Run `npm run build` and `npm test`. For auth/data changes also run
  `npm run test:integration` against local Supabase.
- Test both allowed and denied access, validation, uniqueness conflicts, and
  production guards, browser table denial, transaction rollback, and concurrent
  identity isolation. Clean up temporary fixtures; never reset an existing
  database just to run tests.

## SQL generation

- Author application SQL in `../supabase/queries/*.sql` with PgTyped named queries.
  Import generated calls from `src/generated/`; never edit generated files or put
  SQL in controllers. Shared transaction setup SQL stays in `config/database.ts`.
- `npm run sql:generate` introspects the running, migrated local database.
  It does not parse migration files or apply migrations. Commit SQL and generated
  TypeScript together. `npm run sql:check` fails when generated files are stale.
- `npm run dev` generates first; run `npm run sql:watch` in another terminal when
  editing SQL. After schema changes, regenerate explicitly. Run `npm run check`
  before submitting against your migrated local Supabase database.
- `SQL_GENERATION_DATABASE_URL` is local-only tooling configuration and may use
  the local database owner for introspection. Never deploy it or reuse production
  credentials. Runtime `DATABASE_URL` remains the restricted server login.
- PgTyped binds parameters through the shared Postgres.js adapter inside `withUser`.
  Never interpolate values into SQL text. Generated types are compile-time checks,
  not authorization or input validation: keep Zod, enum parsing, and RLS.
- Vercel runs `npm run build` using committed generated files. Do not run codegen
  at deployment or add a production database dependency to the build.
- CHECK-constrained text columns are generated as strings; keep existing business
  enums and validate external values. Generated files follow PgTyped's own format.

## Test scope

Keep API tests in separate files by feature (`auth.test.ts`, `profile.test.ts`,
`listings.test.ts`, `feed.test.ts`, and `campus.test.ts`). Put shared server and
local fixture setup in `tests/helpers/`; do not collect all API tests into one file.

Test behavior we own: API contracts, business validation, authorization/RLS,
transaction isolation, error mapping, response privacy, logging, and tooling
wrappers. Do not test third-party library internals or duplicate TypeScript's
checks with generated-type test fixtures. Keep integration tests that exercise
our configuration and code through dependencies. Exclude generated files from
coverage if coverage reporting is added; prioritize meaningful branches over
an arbitrary coverage percentage.
