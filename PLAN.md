# Development Plan — Badminton Interclub Predictions Web App

## Concept

Each member predicts the results of the club's interclub fixtures. A points system ranks predictors over a season.

There is a single club, shared by all users — no multi-club/club-membership model.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (React) | SSR + pages, single project for front and API |
| Backend/API | Next.js API routes | No separate backend service — see note below |
| Database | PostgreSQL | |
| ORM | Prisma | |
| Auth | Supabase Auth (magic link) | |
| Hosting | Vercel (front) + Supabase (Postgres + Auth) | |
| UI | Tailwind + shadcn/ui | |

**Supabase over Neon + NextAuth.** Built-in magic-link auth removes the most tedious part of the MVP, and Postgres is directly accessible with Prisma on top. NextAuth + Neon means wiring auth by hand for no gain at this scale.

**No NestJS.** ~50 users per club and business logic that fits in three functions. API routes are enough; "split it out later" is an open door that costs time without ever being used.

---

## Prediction Format — Decided

**Exact match score** (5-3, 6-2, etc.).

Rejected alternatives:
- *Simple winner* — too weak. Many interclub fixtures have an obvious favourite, everyone submits the same prediction and the leaderboard never moves.
- *Per-rubber detail* — too heavy to enter on mobile (8 rubbers × 2 teams) and assumes knowing the line-ups, which usually aren't published before match day.

**Scoring:** correct winner = 1 pt, exact score = 3 pts. **The 3 replaces the 1, they don't stack.**

Store the result as `home_score` / `away_score` (two integers), never as a `"5-3"` string.

---

## Data Model

### Season
- `id`, `name`, `starts_at`, `ends_at`, `is_current`

**Season is part of the model from day one, not a Phase 4 feature.** A `Team` changes division every season. Without `season_id` on Match / Team / Prediction from the start, the schema has to be rewritten later — 30 minutes now versus a painful migration.

### Team
- `id`, `season_id`, `division`, `name`

### User
- `id`, `name`, `email`, `is_superadmin`

`is_superadmin` is the only permission flag — see [Roles & Permissions](#roles--permissions).

### AuditLog
- `id`, `user_id`, `action`, `entity`, `entity_id`, `before`, `after`, `created_at`

Covers result entry and `locks_at` changes at minimum — the two actions that can rewrite a leaderboard.

### Match (fixture)
- `id`, `season_id`, `home_team_id`, `away_team_id`, `date`, `locks_at`, `round`, `status` (upcoming / live / finished), `home_score`, `away_score`

**`locks_at` is separate from `date`.** Defaults to the match date but is admin-editable. Interclub fixture times move often (postponements, rescheduling) — without a separate field, postponing a fixture retroactively reopens predictions that were already locked.

### Prediction
- `id`, `user_id`, `match_id`, `season_id`, `home_score`, `away_score`, `submitted_at`

### PredictionScore
- `id`, `prediction_id`, `user_id`, `season_id`, `points`, `rule_applied`, `computed_at`

**Points are frozen in the database, never computed on the fly.** Scoring runs as a job triggered when the official result is entered. Two reasons: the scoring rules can change without rewriting history, and a user can be told exactly why they got 3 points.

---

## Locking

Locking must be enforced **server-side on write**, not just by hiding the form. A client-side check alone means anyone can POST directly to the API after kickoff. Every prediction write validates `now < match.locks_at` before it commits.

---

## Roles & Permissions

One role beyond ordinary members: **superadmin** (sees and does everything — enters results, edits `locks_at`, manages the season/team/fixture structure). There is no per-club admin tier, since there is only one club.

### Bootstrapping the first superadmin

The first superadmin can't be created through the app — there's no admin to create them. Use a **seed script** (`prisma/seed.ts`) that promotes a hardcoded email, run once against production. It's auditable and lives in the repo, unlike a manual `UPDATE` in the Supabase console.

### Server-side enforcement

Hiding the admin button is not access control; the API route is the boundary. Every mutating route checks the caller's rights server-side:

| Action | Allowed if |
|---|---|
| Enter/edit a fixture result | superadmin |
| Edit `locks_at` | superadmin |
| Create/edit fixtures | superadmin |
| Submit a prediction | any member, subject to `locks_at` |

Without the result-entry check, any logged-in member can POST a result for any fixture and rewrite the leaderboard.

`locks_at` deserves particular care: it's admin-editable, which makes it a way to reopen a closed prediction window. Every change goes to `AuditLog` with who and when, so a "why was my prediction overwritten" complaint has an answer.

### Admins predicting on their own fixtures

**Allowed.** A superadmin can predict on fixtures they also enter results for. This is a friendly club app — everyone knows who the admin is, and social trust does the work that a technical control would do badly. The alternative (barring admins from predicting) punishes the people doing the unpaid work of running the thing.

Decided deliberately rather than discovered. If it ever becomes a problem, the cheap fix is already available: entering a result freezes that admin's own prediction for the fixture from further edits, which falls out of the existing `locks_at` logic. Not built for the MVP.

---

## MVP Features

- Sign-up / login
- List of upcoming fixtures for the season
- Prediction entry before kickoff (server-enforced lock at `locks_at`)
- Official result entry (admin)
- Automatic points calculation (job on result entry)
- **Predictor leaderboard**, one per season, shared by every user — there is a single club, so no per-club scoping or normalisation is needed.

---

## Phases

**Phase 0 — Framing (1 evening).** Most decisions are already made above. What's left: confirm the scoring scale and the fixture data source. Originally scoped at a week; that's oversized for a solo project once the decisions are written down.

**Phase 1 — Foundation (1–2 wk).** Next.js + Prisma + Postgres + Supabase auth. Season/Team/Match/User models. Seed script including the first superadmin. **CSV fixture import built here, not later** — test data has to be seeded anyway, so make the seed path the real import path.

**Phase 2 — Core (2–3 wk).** Prediction entry, server-side time lock, admin result entry, permission checks on every mutating route, `AuditLog` on result and `locks_at` changes, scoring engine writing to `PredictionScore`.

**Phase 3 — Leaderboards & UX (1–2 wk).** Leaderboard, profile page, history, mobile responsive. **Pre-fixture reminder email lands at the end of this phase** — moved up from Phase 4, see risk below.

**Phase 4 — Polish.** Richer notifications, season rollover tooling.

---

## Badminton-Specific Notes

- **Fixture source.** Interclub fixtures come from Poona/FFBaD. No simple public API → admin entry or CSV import. Entering a full season by hand is tedious and error-prone, which is why CSV import is Phase 1.
- **Locking.** Predictions close at `locks_at`, enforced server-side.
- **Score format.** A fixture is several rubbers (singles/doubles/mixed); we bet on the fixture total, not the detail. See the decision above.

---

## The Real Risk

It isn't technical — it's adoption. If members don't predict, the app is empty and dead in three weeks. Two things are worth more than half of Phase 4:

- **Frictionless onboarding** — magic link, no password, no membership step to complete before predicting.
- **Pre-fixture reminder** — probably the single feature that decides whether the app lives or dies. Even a plain email is enough at first, which is why it moved into Phase 3.
