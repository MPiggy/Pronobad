import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

/**
 * Seeds the database.
 *
 * Two jobs, and only the first runs in production:
 *
 * 1. Promote `SUPERADMIN_EMAIL` to superadmin. The first superadmin cannot be
 *    created through the app — there is no admin to create them (PLAN.md).
 *    Doing it here keeps the act in version control, unlike a manual UPDATE in
 *    the Supabase console.
 * 2. Create demo clubs, teams and fixtures, so a fresh local database is
 *    usable immediately. Skipped unless SEED_DEMO_DATA=true.
 *
 * Idempotent throughout: running it twice must not duplicate anything, because
 * it will be run twice.
 */

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DIRECT_URL (or DATABASE_URL) must be set to seed. See .env.example.',
  )
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

/**
 * Marks an email as superadmin.
 *
 * The row may not exist yet: Supabase creates the identity on first login, and
 * our `User` row is created from it at that moment. So when the person has
 * never logged in, we record the intent with a placeholder `authId` and let
 * the login flow adopt the row by email.
 */
async function promoteSuperadmin(email: string) {
  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    if (existing.isSuperadmin) {
      console.log(`✓ ${email} is already a superadmin.`)
      return
    }

    await db.user.update({
      where: { id: existing.id },
      data: { isSuperadmin: true },
    })

    console.log(`✓ Promoted existing user ${email} to superadmin.`)
    return
  }

  // `authId` is NOT NULL and unique, but the real Supabase id is unknown until
  // this person first signs in. A namespaced placeholder keeps the constraint
  // satisfied and cannot collide with a real Supabase UUID.
  await db.user.create({
    data: {
      email,
      authId: `pending:${email}`,
      name: email.split('@')[0] ?? 'Superadmin',
      isSuperadmin: true,
    },
  })

  console.log(
    `✓ Pre-created superadmin ${email}. It activates when they first sign in.`,
  )
}

async function seedDemoData() {
  const season = await db.season.upsert({
    where: { id: 'demo-season-2026' },
    update: {},
    create: {
      id: 'demo-season-2026',
      name: 'Saison 2025-2026',
      startsAt: new Date('2025-09-01T00:00:00Z'),
      endsAt: new Date('2026-06-30T00:00:00Z'),
      isCurrent: true,
    },
  })

  const clubNames = [
    'Badminton Club de Lyon',
    'Volant Grenoblois',
    'Saint-Étienne Badminton',
  ]

  const clubs = []
  for (const name of clubNames) {
    clubs.push(
      await db.club.upsert({
        where: { name },
        update: {},
        create: { name, region: 'Auvergne-Rhône-Alpes' },
      }),
    )
  }

  const teams = []
  for (const club of clubs) {
    const name = `${club.name} 1`

    teams.push(
      await db.team.upsert({
        where: {
          clubId_seasonId_name: { clubId: club.id, seasonId: season.id, name },
        },
        update: {},
        create: { name, division: 'Régionale 1', clubId: club.id, seasonId: season.id },
      }),
    )
  }

  // A past fixture (already played), and two upcoming ones — enough to exercise
  // the locked, open, and scored states without hand-editing dates.
  const [first, second, third] = teams
  if (!first || !second || !third) return

  const fixtures = [
    {
      homeTeamId: first.id,
      awayTeamId: second.id,
      round: 1,
      playedAt: new Date('2025-10-04T18:00:00Z'),
      locksAt: new Date('2025-10-04T18:00:00Z'),
    },
    {
      homeTeamId: second.id,
      awayTeamId: third.id,
      round: 2,
      playedAt: new Date('2026-11-15T18:00:00Z'),
      locksAt: new Date('2026-11-15T18:00:00Z'),
    },
    {
      homeTeamId: third.id,
      awayTeamId: first.id,
      round: 3,
      playedAt: new Date('2026-12-06T18:00:00Z'),
      locksAt: new Date('2026-12-06T18:00:00Z'),
    },
  ]

  for (const fixture of fixtures) {
    await db.match.upsert({
      where: {
        seasonId_homeTeamId_awayTeamId_round: {
          seasonId: season.id,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          round: fixture.round,
        },
      },
      update: {},
      create: { ...fixture, seasonId: season.id },
    })
  }

  console.log(
    `✓ Demo data: ${clubs.length} clubs, ${teams.length} teams, ${fixtures.length} fixtures.`,
  )
}

async function main() {
  const email = process.env.SUPERADMIN_EMAIL

  if (email) {
    await promoteSuperadmin(email.trim().toLowerCase())
  } else {
    console.warn('! SUPERADMIN_EMAIL is not set — skipping superadmin promotion.')
  }

  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedDemoData()
  } else {
    console.log('· Skipping demo data (set SEED_DEMO_DATA=true to include it).')
  }
}

main()
  .catch((error) => {
    console.error(error)
    // Non-zero exit, so a failed seed fails the command that ran it rather
    // than looking like success.
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
