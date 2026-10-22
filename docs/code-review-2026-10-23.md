# Codebase review — 23 October 2026

Reviewed the React auth, profile and campus flows; Express routes, validation,
authorization, logging and database adapter; Supabase migrations, RLS, queries,
Storage policies, email configuration, tests and CI. This is a repository and
local-runtime review, not a review of hosted Supabase or Vercel settings.

## Remaining findings

1. **P2 — Frontend development tooling has known advisories.**
   `frontend/package.json:30` and `:31`, with the installed lockfile, retain
   Tailwind 3.4.19 and Vite 5.4.21. `npm audit --json` reports nine affected
   packages: six high and three moderate. This includes Vite file-serving and
   editor-launch issues, esbuild's development-server cross-origin issue, and
   build-tool parser denial of service issues. These are development/build
   dependencies: `npm audit --omit=dev --json` reports zero runtime advisories.
   Upgrade and verify the frontend toolchain separately; npm proposes major
   upgrades, so blindly applying `npm audit fix --force` is inappropriate.
   Sources: [Vite file-serving advisory](https://github.com/advisories/GHSA-rq7h-c2jc-7f22),
   [esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
   [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

2. **P2 — CI does not exercise the application's integration or frontend checks.**
   `.github/workflows/backend.yml:4` omits frontend paths and `:30` only runs
   `npm run check`. That invokes the default test command; six integration
   groups are skipped unless `RUN_INTEGRATION=1`. A regression in email codes,
   Storage, campus permissions or the frontend can therefore pass the existing
   workflow. Add frontend test/lint/build checks and run `test:integration`
   against the started local stack, using only its local Auth configuration.
   Use the pinned CLI through `npx` for cleanup as well.

3. **P2 — Duplicate student IDs are distinguishable through signup responses.**
   `backend/src/controllers/auth.controller.ts:19` maps a duplicate-ID Auth
   trigger failure to HTTP 502, while an unused ID produces HTTP 202.
   `backend/tests/auth.test.ts` verifies this difference. Responses do not echo
   account details, but repeated requests can reveal that an ID is already used.
   If hiding student-ID registration is required, normalize this specific
   response too, and provide an account-recovery path. Existing-account sign-in
   already returns identical responses for known and unknown emails.

## Findings fixed in this change

- **P1 — Cross-origin campus actions were blocked.**
  `backend/src/app.ts:23` omitted PUT even though follow/like/save/RSVP routes
  use it. Added PUT and a real OPTIONS preflight regression in
  `backend/tests/http.test.ts` with Authorization and Content-Type headers.
- **P2 — Profile details survived sign-out in another tab.**
  `frontend/src/components/Profile.jsx:17` now observes Auth changes, clears
  profile state, cancels outdated loads and returns to sign-in when the session
  ends. Verified in Safari with two profile tabs: signing out in the second tab
  removed the first tab's profile and opened `#/signup`.
- **P2 — A database assertion assumed an empty database.**
  `supabase/tests/access_control.sql` counted every listing moderated by an
  admin, so seeded records made it fail. Limited the update to its fixture
  author. The complete assertions now pass against the existing seeded database;
  the transaction rolls back all temporary fixtures.
- Auth/profile validation tests initialize their test environment before
  importing controllers. The default tests also pass without a local `.env`.

## Skill assessment

- **Supabase** (`.agents/skills/supabase/SKILL.md`): the browser uses a public
  Auth client to verify the emailed code and persist the session. No service key
  or verification code is logged or sent through the Express API. Profile photos
  use the existing Storage ownership rules. Hosted settings were not inspected.
- **Postgres** (`.agents/skills/supabase-postgres-best-practices/SKILL.md`,
  RLS basics/performance references): application access remains behind the
  restricted server role, transaction-local Auth identity and RLS. Queries are
  parameterized; public API IDs are UUIDs; browser application-table access is
  denied. Live local tests cover isolation, rollback, role checks, ownership and
  unconfirmed/anonymous denial. No schema migration was needed for email OTP.
- **Backend development and coding standards** (both skills under
  `backend/.agents/skills/`): strict Zod request validation, shared error codes,
  Express 5 error handling and feature-separated tests remain intact. The
  findings above identify the remaining CI and privacy gaps. Repository guidance
  takes precedence over the backend skill's generic Prisma/Sentry/DI examples.
- **Frontend design** (`frontend/.agents/skills/skills-frontend-des.md`): retained
  the established campus identity while adding a labelled single code field,
  numeric keyboard hint, one-time-code autofill, focus treatment, visible errors,
  resend cooldown and change-email action. Invalid-code and successful same-tab
  sign-in were exercised in Safari. Mobile layout and autofill on real mobile
  devices were not manually tested in this review.

## Verification

- Backend `npm run check`: generated SQL consistency, TypeScript build and
  default tests pass.
- Backend `npm run test:integration`: all 28 tests pass, including actual Mailpit
  OTP signup/sign-in, wrong-code rejection, one-time use, unknown-account privacy,
  Storage ownership and campus permissions.
- Backend tests pass with `DOTENV_CONFIG_PATH` pointing to a nonexistent file.
- `supabase/tests/access_control.sql` passes with all temporary changes rolled back.
- Frontend `npm test`: eight redirect tests pass; lint and production build pass.
- Safari: correct code opens `#/dashboard` in the original app tab; a wrong code
  keeps the form visible; cross-tab sign-out removes private profile details.
- Backend audit: zero advisories. Frontend runtime audit: zero advisories.

## Deployment requirement and deliberate limitations

Local Supabase was restarted with data preserved and now sends six-digit codes
that expire after 600 seconds. Hosted Supabase still requires copying
`supabase/templates/sign-in-code.html` into both **Magic Link** and **Confirm
signup** email templates, with matching OTP length/expiry and email confirmation
enabled. Committing local configuration does not apply hosted Auth settings.
See `backend/README.md` for the steps and
[Supabase's email OTP documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Friends, messaging delivery, event management UI and immediate WebSocket updates
are not implemented; the current campus uses authenticated polling. These are
documented feature limitations, not newly discovered regressions. Existing
access tokens remain valid until expiry after sign-out, as documented by the
API's local JWT verification design. Public avatar URLs are also an existing,
documented Storage choice.
