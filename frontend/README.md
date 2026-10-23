# HUS frontend

Run `npm install` and `npm run dev` from this directory. Use `npm run build`
for production assets, `npm run lint` for ESLint, and `npm test` for auth redirect
and isolated-build regression tests. Run the API in `backend/`
and configure the Vite API proxy as described in its README.

Shared browser imports from `backend/src/types/` must be dependency-free. Import
campus actions from `campusAction.ts`, not the Zod-backed `domain.ts` module.
The isolated-build test checks this without backend dependencies installed.

## Campus

Sign-in and signup use a six-digit code sent to the Temple email address. Enter
it in the same tab to open `/#/dashboard`. The form supports code paste/autofill,
resend after 60 seconds, and changing the email. Restoring an existing session
preserves club, event, and profile links. See the backend README for the required
hosted Supabase email-template settings.

- `/#/clubs`: Following, Discover, and Events feeds, search, and interest filters.
- `/#/clubs/:id`: club profile. IDs are UUIDs; seeded club slugs such as `film` also work.
- `/#/events/:id`: event details and account-persisted RSVP. Seeded slugs such as `screening` also work.
- `/#/dashboard`: club posts, marketplace finds, and housing suggestions.
- `/#/activity` and `/#/saved`: the signed-in student's RSVPs and saved posts.
- `/#/friends`: introduction for the future friends feature.

The landing page's **Clubs & Orgs** link opens the campus. All campus data goes
through the authenticated Express `/api/campus` API. The browser uses Supabase
for Auth and profile-photo Storage only. There is no fallback to mock fixtures or device-local interaction
state. Old `hus-campus-*` preview storage is ignored.

Follows, likes, saves, and RSVPs persist in Postgres for the signed-in account.
Controls wait for API confirmation and report failed writes. Assigned club
leaders/admins see **Share a club update**, with an optional existing event
attachment. The backend independently enforces publishing ownership.

Updates are checked every 15 seconds while the page is visible, and on returning
to it. New posts wait behind **Show updates**; refreshes do not automatically
insert posts into the reading position. Network errors keep existing content
visible with a retry action. Signing out or changing accounts clears the previous
account's campus state. This is polling, not a live WebSocket subscription.

For local sample content, apply migrations and run `npm run db:seed` from
`backend/`. Use the sign-in form with `hootus-demo@temple.edu` for the student
view or `hootus-clubs@temple.edu` for the club-leader posting form, and open the
email in local Mailpit. All sample clubs, events, and listings are illustrative.

Check the layout at desktop and at 320px/390px widths. Verify following, saving,
and RSVPs survive a reload and are isolated across accounts. Friends, ticketing,
capacity limits, and an event-creation interface remain future work.
