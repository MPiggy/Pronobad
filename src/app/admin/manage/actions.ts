'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  ForbiddenError,
  NotFoundError,
  getActor,
  requireClubAdmin,
  requireSuperadmin,
} from '@/lib/auth/guards'
import { canImportFixtures } from '@/lib/auth/permissions'
import { getCurrentSeason } from '@/lib/seasons'
import { parseParisDateTimeLocal } from '@/lib/format'
import { Prisma } from '@/generated/prisma/client'

/**
 * Structure mutations: seasons, clubs, teams, fixtures, and club-admin grants.
 *
 * Kept apart from `../actions.ts`, which handles the day-to-day of a season
 * already in place (results, deadlines). Everything here changes what exists
 * rather than what happened, and all but team/fixture creation is superadmin
 * territory (PLAN.md § Roles & Permissions).
 */

export type ManageState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string }

/** Turns a thrown guard error into a message the form can show. */
function toErrorState(error: unknown): ManageState {
  if (error instanceof ForbiddenError || error instanceof NotFoundError) {
    return { status: 'error', message: error.message }
  }

  throw error
}

/** Whether a Prisma error is a unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

/** The pages whose content depends on the structure edited here. */
function revalidateStructure() {
  revalidatePath('/admin')
  revalidatePath('/admin/manage')
  revalidatePath('/fixtures')
  revalidatePath('/leaderboard')
  revalidatePath('/onboarding')
}

// ---------------------------------------------------------------------------
// Seasons

const seasonSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, { message: 'Indiquez un nom de saison (ex. « Saison 2026-2027 »).' })
      .max(60, { message: 'Ce nom est trop long (60 caractères maximum).' }),
    startsAt: z.iso.date({ message: 'Indiquez une date de début.' }),
    endsAt: z.iso.date({ message: 'Indiquez une date de fin.' }),
  })
  .refine((season) => season.startsAt < season.endsAt, {
    message: 'La fin de saison doit être après son début.',
  })

/**
 * Creates a season and makes it current.
 *
 * The `isCurrent` flip happens in the same transaction as the creation — two
 * seasons both flagged current would make every page pick one at random.
 */
export async function createSeason(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = seasonSchema.safeParse({
    name: formData.get('name'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Saison invalide.',
    }
  }

  const { name, startsAt, endsAt } = parsed.data

  try {
    const actor = await requireSuperadmin()

    const season = await db.$transaction(async (tx) => {
      await tx.season.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      })

      return await tx.season.create({
        data: {
          name,
          // Date-only inputs, read as Paris midnight — a season starting "le
          // 1er septembre" should not begin on August 31st in UTC.
          startsAt: parseParisDateTimeLocal(`${startsAt}T00:00`)!,
          endsAt: parseParisDateTimeLocal(`${endsAt}T23:59`)!,
          isCurrent: true,
        },
      })
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'SEASON_CREATED',
        entity: 'Season',
        entityId: season.id,
        after: { name, startsAt, endsAt, isCurrent: true },
      },
    })

    revalidateStructure()

    return { status: 'saved', message: `Saison « ${name} » créée et activée.` }
  } catch (error) {
    return toErrorState(error)
  }
}

// ---------------------------------------------------------------------------
// Clubs

const clubSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Indiquez le nom du club (2 caractères minimum).' })
    .max(80, { message: 'Ce nom est trop long (80 caractères maximum).' }),
  region: z
    .string()
    .trim()
    .max(80, { message: 'Cette région est trop longue (80 caractères maximum).' })
    .optional(),
})

/** Creates a club. Superadmin only — clubs are the top of the structure. */
export async function createClub(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = clubSchema.safeParse({
    name: formData.get('name'),
    region: formData.get('region') ?? undefined,
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Club invalide.',
    }
  }

  const { name, region } = parsed.data

  try {
    await requireSuperadmin()

    await db.club.create({
      data: { name, region: region || null },
    })

    revalidateStructure()

    return { status: 'saved', message: `Club « ${name} » créé.` }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: 'error', message: 'Un club porte déjà ce nom.' }
    }

    return toErrorState(error)
  }
}

// ---------------------------------------------------------------------------
// Teams

const teamSchema = z.object({
  clubId: z.string().min(1, { message: 'Choisissez un club.' }),
  name: z
    .string()
    .trim()
    .min(1, { message: 'Indiquez le nom de l’équipe (ex. « Lyon 1 »).' })
    .max(80, { message: 'Ce nom est trop long (80 caractères maximum).' }),
  division: z
    .string()
    .trim()
    .min(1, { message: 'Indiquez la division (ex. « Régionale 1 »).' })
    .max(60, { message: 'Cette division est trop longue (60 caractères maximum).' }),
})

/**
 * Creates a team in the current season.
 *
 * Open to the club's own admins, not just superadmins — registering your own
 * club's teams is the same routine work as importing its fixtures
 * (`canImportFixtures` in PLAN.md's permission table).
 */
export async function createTeam(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = teamSchema.safeParse({
    clubId: formData.get('clubId'),
    name: formData.get('name'),
    division: formData.get('division'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Équipe invalide.',
    }
  }

  const { clubId, name, division } = parsed.data

  try {
    await requireClubAdmin(clubId)

    const season = await getCurrentSeason()

    if (!season) {
      return {
        status: 'error',
        message: 'Créez d’abord une saison : une équipe est liée à une saison.',
      }
    }

    // Checked rather than trusted — the id arrives from a form the caller
    // controls, and a bad one would otherwise surface as a foreign-key error.
    const club = await db.club.findUnique({ where: { id: clubId }, select: { name: true } })

    if (!club) {
      return { status: 'error', message: 'Ce club n’existe pas.' }
    }

    await db.team.create({
      data: { clubId, seasonId: season.id, name, division },
    })

    revalidateStructure()

    return { status: 'saved', message: `Équipe « ${name} » créée (${season.name}).` }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'Ce club a déjà une équipe de ce nom cette saison.',
      }
    }

    return toErrorState(error)
  }
}

// ---------------------------------------------------------------------------
// Fixtures

const matchSchema = z.object({
  homeTeamId: z.string().min(1, { message: 'Choisissez l’équipe à domicile.' }),
  awayTeamId: z.string().min(1, { message: 'Choisissez l’équipe à l’extérieur.' }),
  playedAt: z.string().min(1, { message: 'Indiquez la date de la rencontre.' }),
  round: z.coerce
    .number({ message: 'Indiquez la journée.' })
    .int({ message: 'La journée doit être un nombre entier.' })
    .min(1, { message: 'La journée commence à 1.' })
    .max(52, { message: 'Journée invalide.' }),
})

/**
 * Creates a fixture between two teams of the current season.
 *
 * `locksAt` starts equal to `playedAt` — the PLAN.md default — and is then
 * adjustable per fixture from the main admin page. Allowed for an admin of
 * either club involved, same as the CSV-import rule it stands in for.
 */
export async function createMatch(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = matchSchema.safeParse({
    homeTeamId: formData.get('homeTeamId'),
    awayTeamId: formData.get('awayTeamId'),
    playedAt: formData.get('playedAt'),
    round: formData.get('round'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Rencontre invalide.',
    }
  }

  const { homeTeamId, awayTeamId, round } = parsed.data

  if (homeTeamId === awayTeamId) {
    return {
      status: 'error',
      message: 'Une équipe ne peut pas jouer contre elle-même.',
    }
  }

  const playedAt = parseParisDateTimeLocal(parsed.data.playedAt)

  if (!playedAt || Number.isNaN(playedAt.getTime())) {
    return { status: 'error', message: 'Date de rencontre invalide.' }
  }

  try {
    const actor = await getActor()
    const season = await getCurrentSeason()

    if (!season) {
      return { status: 'error', message: 'Créez d’abord une saison.' }
    }

    const teams = await db.team.findMany({
      where: { id: { in: [homeTeamId, awayTeamId] } },
      select: { id: true, clubId: true, seasonId: true },
    })

    const home = teams.find((team) => team.id === homeTeamId)
    const away = teams.find((team) => team.id === awayTeamId)

    if (!home || !away) {
      return { status: 'error', message: 'L’une des deux équipes n’existe pas.' }
    }

    if (home.seasonId !== season.id || away.seasonId !== season.id) {
      return {
        status: 'error',
        message: 'Les deux équipes doivent appartenir à la saison en cours.',
      }
    }

    // Same scope as a CSV import: an admin of either club may create the
    // fixture, anyone else may not — whatever the form showed them.
    if (
      !canImportFixtures(actor, home.clubId) &&
      !canImportFixtures(actor, away.clubId)
    ) {
      return {
        status: 'error',
        message:
          'Seul un administrateur de l’un des deux clubs peut créer cette rencontre.',
      }
    }

    const match = await db.match.create({
      data: {
        seasonId: season.id,
        homeTeamId,
        awayTeamId,
        round,
        playedAt,
        // Predictions close at kickoff by default; adjustable from /admin.
        locksAt: playedAt,
      },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MATCH_CREATED',
        entity: 'Match',
        entityId: match.id,
        after: {
          homeTeamId,
          awayTeamId,
          round,
          playedAt: playedAt.toISOString(),
        },
      },
    })

    revalidateStructure()

    return { status: 'saved', message: 'Rencontre créée. Résultat et fermeture se gèrent depuis l’onglet Admin.' }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'Cette rencontre existe déjà pour cette journée.',
      }
    }

    return toErrorState(error)
  }
}

// ---------------------------------------------------------------------------
// Club admins

const grantSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Adresse e-mail invalide.' })),
  clubId: z.string().min(1, { message: 'Choisissez un club.' }),
})

/**
 * Grants club-admin rights to an existing member.
 *
 * Superadmin only (PLAN.md: letting club admins promote admins would make the
 * permission set grow on its own). The member must have signed in at least
 * once — granting rights to an address nobody owns yet would hand them out to
 * whoever registers it later.
 */
export async function grantClubAdmin(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = grantSchema.safeParse({
    email: formData.get('email'),
    clubId: formData.get('clubId'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Formulaire invalide.',
    }
  }

  const { email, clubId } = parsed.data

  try {
    const actor = await requireSuperadmin()

    const [user, club] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true, name: true } }),
      db.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } }),
    ])

    if (!club) {
      return { status: 'error', message: 'Ce club n’existe pas.' }
    }

    if (!user) {
      return {
        status: 'error',
        message:
          'Aucun membre avec cette adresse. La personne doit se connecter une première fois avant d’être promue.',
      }
    }

    const existing = await db.clubAdmin.findUnique({
      where: { userId_clubId: { userId: user.id, clubId } },
    })

    if (existing) {
      return {
        status: 'error',
        message: `${user.name} administre déjà ${club.name}.`,
      }
    }

    await db.clubAdmin.create({ data: { userId: user.id, clubId } })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'ADMIN_GRANTED',
        entity: 'ClubAdmin',
        entityId: `${user.id}:${clubId}`,
        after: { userId: user.id, email, clubId, clubName: club.name },
      },
    })

    revalidateStructure()

    return {
      status: 'saved',
      message: `${user.name} administre désormais ${club.name}.`,
    }
  } catch (error) {
    return toErrorState(error)
  }
}

const revokeSchema = z.object({
  userId: z.string().min(1),
  clubId: z.string().min(1),
})

/** Withdraws club-admin rights. Superadmin only, audited like the grant. */
export async function revokeClubAdmin(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = revokeSchema.safeParse({
    userId: formData.get('userId'),
    clubId: formData.get('clubId'),
  })

  if (!parsed.success) {
    return { status: 'error', message: 'Demande invalide.' }
  }

  const { userId, clubId } = parsed.data

  try {
    const actor = await requireSuperadmin()

    const existing = await db.clubAdmin.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { user: { select: { email: true, name: true } } },
    })

    if (!existing) {
      return { status: 'error', message: 'Ce droit d’administration n’existe plus.' }
    }

    await db.clubAdmin.delete({
      where: { userId_clubId: { userId, clubId } },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'ADMIN_REVOKED',
        entity: 'ClubAdmin',
        entityId: `${userId}:${clubId}`,
        before: { userId, email: existing.user.email, clubId },
      },
    })

    revalidateStructure()

    return { status: 'saved', message: `Droits de ${existing.user.name} retirés.` }
  } catch (error) {
    return toErrorState(error)
  }
}
