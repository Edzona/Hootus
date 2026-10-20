# Repository guide

## Local skills

- Before working, inspect `.agents/skills/` and read each relevant `SKILL.md`.
  Select skills by the task and code involved, not just matching keywords.
  Follow referenced guides when relevant; do not load unrelated material.
- Load `.agents/skills/supabase/SKILL.md` for Supabase Auth, clients, database,
  RLS, Realtime, configuration, debugging, and security reviews.
- Also load `.agents/skills/supabase-postgres-best-practices/SKILL.md` before
  database schema, SQL, migration, index, or RLS work and for database reviews.
- State which skills are being applied. During reviews, report how well the
  code matches their guidance, with concrete file references and test evidence.
  Distinguish verified problems from risks or features not implemented yet.
- Apply recommendations proportionately to this small application. These two
  skills do not replace frontend, accessibility, Express, or Vercel reviews.
- Explicit user instructions take precedence over skill guidance. Never reset
  existing data merely to run checks, and never print secrets.

## Backend

Follow `backend/AGENTS.md` for API structure, validation, helpers, enums, logging,
and tests. Keep implementation simple and preserve unrelated work.
