# Pronobad

Interclub badminton predictions. Club members predict the score of their team's
fixtures; points are awarded when the official result is entered, and a
per-club leaderboard ranks predictors over the season.

See [PLAN.md](PLAN.md) for the design decisions and their reasoning.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 · PostgreSQL (Supabase) ·
Supabase Auth (magic link) · Tailwind CSS 4 · TypeScript

Mobile-first: members open this on a phone, in a gym, on bad wifi.

## Requirements

Node **22.12+** (Prisma 7 requires `^20.19 || ^22.12 || >=24`). The repo pins
22.23.2 via `.nvmrc`.

## Local setup

```bash
npm install
cp .env.example .env    # then fill in your Supabase values
npm run db:migrate      # creates the schema
npm run db:seed         # creates the first superadmin
npm run dev
```

`.env.example` documents where each value comes from in the Supabase dashboard.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repository. The framework is
   detected automatically; no build settings need changing.
3. Add the environment variables below under **Settings → Environment
   Variables**, then deploy.

### Required environment variables

| Variable | Where it comes from | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Database → Connection string | **Pooled** connection, port 6543, with `?pgbouncer=true` |
| `DIRECT_URL` | Same page | **Direct** connection, port 5432 — migrations must bypass the pooler |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API Keys | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys | The `sb_publishable_…` key. Public by design, safe to expose |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL | Magic-link redirects are built from this |
| `SUPERADMIN_EMAIL` | Your email | Only read by the seed script |

The build runs `prisma generate && next build`, so the Prisma client is
regenerated on every deploy.

### Migrations on deploy

Migrations are **not** run automatically — that would make every deploy a
schema change. Run them deliberately:

```bash
npm run db:deploy
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (generates Prisma client first) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest |
| `npm run db:migrate` | Create and apply a migration locally |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Seed data, including the first superadmin |
| `npm run db:studio` | Prisma Studio |
