# Hootus

**A campus-oriented marketplace and club platform for Temple University Japan (TUJ) students.**

Hootus is an English-first platform, closed to the TUJ student body, that doesn't rely on Japanese banks or phone numbers. Students can trade goods, hire peers, and get notified about local deals and campus announcements.

## Features

- **TUJ Email Authentication** — Mandatory `@tuj.temple.edu` login to keep the community verified and safe.
- **Categorized Marketplace** — Separate feeds for:
  - **Housing** — subleasing and roommate searches
  - **Sales** — clothing, furniture, appliances, electronics, etc.
  - **Student Gigs** — tutoring, errands, personal driver, and other peer services
- **In-App Event RSVPs & Ticketing** — Clubs and faculty can manage limited-capacity RSVPs or sell digital entry tickets directly through the app.
- **Verified Club Profiles & Feeds** — Badged accounts for official TUJ student organizations to post event flyers, meeting times, and room numbers.
- **Local Business "Perks" Hub** — Exclusive Sangenjaya restaurant coupons and English-friendly sharehouse referrals.
- **Real-Time Messaging** — In-app chat between buyers and sellers.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Component-driven UI |
| Styling | Tailwind CSS | Mobile-first styling with PostCSS & Autoprefixer |
| PWA | Web Manifest + Service Worker | "Add to Home Screen" & push notifications |
| Database | PostgreSQL (Supabase) | Relational schemas with strict foreign keys & constraints |
| Auth | Supabase Auth | Google OAuth restricted to `@tuj.temple.edu` domains |
| Security | Row Level Security (RLS) | Database-level row permissions for users & listings |
| Realtime | Supabase Realtime | WebSockets for buyer/seller chat channels |
| Storage | Supabase Storage | Bucket hosting for compressed listing photos |
| Hosting | Vercel | Free preview deployments per Git branch (Staging vs. Prod) |

## Getting Started

> **Prerequisites:** Node.js 18+, a Supabase project, and a Vercel account.

```bash
# Clone the repo
git clone https://github.com/<your-org>/Hootus.git
cd Hootus

# Install dependencies
npm install

# Copy the environment template and fill in your Supabase keys
cp .env.example .env.local

# Start the dev server
npm run dev
```

Required environment variables (see `.env.example`):

- `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key

## Project Timeline (3 Months)

| Phase | Weeks | Goals |
|---|---|---|
| **Phase 1 — Foundation** | 1–3 | Repo setup, Supabase schema + RLS policies, TUJ email auth, base UI shell |
| **Phase 2 — Core Features** | 4–8 | Marketplace feeds (Housing/Sales/Gigs), listing creation + photo upload, realtime chat |
| **Phase 3 — Community Features** | 9–11 | Club profiles, event RSVPs/ticketing, Perks hub |
| **Phase 4 — Polish & Launch** | 12–13 | PWA + push notifications, testing, staging → prod deploy on Vercel |

## Team Workflow

- **Branches:** `main` (prod) ← `staging` ← feature branches (`feature/<name>`)
- **Pull requests:** At least one teammate review before merging into `staging`
- **Deployments:** Every branch gets a Vercel preview URL — share it in the PR for review

## Contributing

1. Create a feature branch off `staging`
2. Commit with clear messages (`feat:`, `fix:`, `chore:` prefixes)
3. Open a PR into `staging` and request a review
4. Merge to `main` only after staging is verified

## Detailed Roadmap

### Phase 1: Architecture & Database Modeling (Weeks 1–2)

- **Relational Schema** — Define PostgreSQL tables (`profiles`, `listings`, `messages`, `gigs`, `clubs`) in the Supabase Dashboard, linked via foreign keys.
- **Domain Lock & Security** — Configure Google OAuth in Supabase with domain restriction (`hd=tuj.temple.edu`) and write Row Level Security (RLS) policies for user data protection.
- **Component Kit Setup** — Initialize the React repo with Tailwind CSS for bottom-tab navigation, modal overlays, and responsive feed grids.

### Phase 2: Core React & Supabase Sprints (Weeks 3–7)

- **Sprint 1 — Auth & Profiles:** Connect Supabase, implement domain-locked OAuth login, and build profile editing and club badge rendering.
- **Sprint 2 — Marketplace Engine:** Browser-based image compression, photo uploads to Supabase Storage, and listing queries with real-time category/price filters.
- **Sprint 3 — Gigs & Club Feeds:** Sub-feeds for peer micro-tasks and dedicated event posting boards for verified campus organizations.
- **Sprint 4 — Realtime Chat & Meetup Pins:** Live messaging via Supabase Realtime WebSocket channels, plus Leaflet/Google Maps embeds for meetup locations.
