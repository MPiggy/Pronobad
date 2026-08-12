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
22.23.2 via `.nvmrc`, and `.npmrc` sets `engine-strict=true` so an older Node
fails with a version error instead of an opaque `ERR_REQUIRE_ESM` from inside
Prisma.

Check with `node --version` before `npm install`. On Windows a system-wide Node
in the machine `PATH` takes precedence over anything nvm sets, so `nvm use` can
appear to work while `node` still resolves to the old version.

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
| `DATABASE_URL` | Supabase → Database → Connection string | **Transaction pooler**, port 6543, with `?pgbouncer=true` |
| `DIRECT_URL` | Same page | **Session pooler**, port 5432 — migrations need session-level features |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API Keys | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API Keys | The `sb_publishable_…` key. Public by design, safe to expose |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL | Magic-link redirects are built from this |
| `SUPERADMIN_EMAIL` | Your email | Only read by the seed script |

The build runs `prisma generate && next build`, so the Prisma client is
regenerated on every deploy.

> **Use the pooler host, not the direct one.** Supabase's direct host
> (`db.PROJECT_REF.supabase.co`) resolves IPv6-only. It works from a local
> machine but is unreachable from Vercel, which has no IPv6 outbound — the
> failure looks like a connection timeout with no obvious cause.

### Supabase Auth configuration

Under **Authentication → URL Configuration**, set:

- **Site URL** — `https://your-app.vercel.app`
- **Redirect URLs** — add `http://localhost:3000/auth/callback` and
  `https://your-app.vercel.app/auth/callback`

Supabase rejects any `emailRedirectTo` that is not on this allow-list. When it
does, the magic-link email still arrives and the link still looks correct, but
clicking it lands on the Site URL with no session — which reads as "login
silently does nothing" rather than as a configuration error.

### Migrations on deploy

Migrations are **not** run automatically — that would make every deploy a
schema change. Run them deliberately:

```bash
npm run db:deploy
```

## Auth

Magic link only — no passwords. Supabase owns identity (`auth.users`); this app
owns club membership, the superadmin flag and predictions. `User.authId` joins
the two, and `src/lib/auth/session.ts` is the only place that crossing happens.

| File | Role |
|---|---|
| `src/proxy.ts` | Refreshes the session on every request, redirects signed-out members to `/login` |
| `src/lib/supabase/{client,server,proxy}.ts` | Supabase clients for browser, server render, and proxy |
| `src/lib/auth/session.ts` | `getCurrentUser` / `requireUser` / `requireOnboardedUser` |
| `src/app/auth/callback/route.ts` | Exchanges the magic-link code for a session |

A `User` row is created on first login rather than by a database trigger, so
the whole flow stays in application code where it can be read and tested.

Two rules worth keeping:

- **`getUser()`, never `getSession()`, on the server.** The session cookie is
  attacker-supplied; only `getUser()` validates the JWT against the auth server.
- **The proxy is load-bearing.** Server Components cannot write cookies, so
  `src/lib/supabase/server.ts` swallows that error. Remove the proxy and
  refreshed tokens are silently dropped, which presents as random logouts.

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
