'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ForbiddenError, NotFoundError, requireSuperadmin } from '@/lib/auth/guards'
import { CURRENT_SEASON_TAG, getCurrentSeason } from '@/lib/seasons'
import { matchesTag } from '@/lib/predictions/queries'
import { parseParisDateTimeLocal } from '@/lib/format'
import { Prisma } from '@/generated/prisma/client'

/**
 * Structure mutations: seasons, teams, and fixtures.
 *
 * Kept apart from `../actions.ts`, which handles the day-to-day of a season
 * already in place (results, deadlines). Everything here changes what exists
 * rather than what happened, and is superadmin-only.
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

/** The admin pages themselves aren't cached with `use cache`, so a path revalidation covers them. */
function revalidateAdminPages() {
  revalidatePath('/admin')
  revalidatePath('/admin/manage')
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

    revalidateAdminPages()
    updateTag(CURRENT_SEASON_TAG)

    return { status: 'saved', message: `Saison « ${name} » créée et activée.` }
  } catch (error) {
    return toErrorState(error)
  }
}

// ---------------------------------------------------------------------------
// Teams

const teamSchema = z.object({
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

/** Creates a team in the current season. Superadmin only. */
export async function createTeam(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = teamSchema.safeParse({
    name: formData.get('name'),
    division: formData.get('division'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Équipe invalide.',
    }
  }

  const { name, division } = parsed.data

  try {
    await requireSuperadmin()

    const season = await getCurrentSeason()

    if (!season) {
      return {
        status: 'error',
        message: 'Créez d’abord une saison : une équipe est liée à une saison.',
      }
    }

    await db.team.create({
      data: { seasonId: season.id, name, division },
    })

    revalidateAdminPages()

    return { status: 'saved', message: `Équipe « ${name} » créée (${season.name}).` }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'Une équipe de ce nom existe déjà cette saison.',
      }
    }

    return toErrorState(error)
  }
}

const updateTeamSchema = z.object({
  teamId: z.string().min(1, { message: 'Équipe invalide.' }),
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

/** Renames a team and/or changes its division. Superadmin only. */
export async function updateTeam(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = updateTeamSchema.safeParse({
    teamId: formData.get('teamId'),
    name: formData.get('name'),
    division: formData.get('division'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Équipe invalide.',
    }
  }

  const { teamId, name, division } = parsed.data

  try {
    const actor = await requireSuperadmin()

    const before = await db.team.findUnique({
      where: { id: teamId },
      select: { name: true, division: true, seasonId: true },
    })

    if (!before) {
      return { status: 'error', message: 'Cette équipe n’existe plus.' }
    }

    await db.team.update({
      where: { id: teamId },
      data: { name, division },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'TEAM_UPDATED',
        entity: 'Team',
        entityId: teamId,
        before,
        after: { name, division, seasonId: before.seasonId },
      },
    })

    revalidateAdminPages()
    updateTag(matchesTag(before.seasonId))

    return { status: 'saved', message: `Équipe « ${name} » mise à jour.` }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: 'error',
        message: 'Une équipe de ce nom existe déjà cette saison.',
      }
    }

    return toErrorState(error)
  }
}

const deleteTeamSchema = z.object({
  teamId: z.string().min(1, { message: 'Équipe invalide.' }),
})

/**
 * Deletes a team. Cascades to its fixtures (and their predictions) per the
 * schema's `onDelete: Cascade` — the confirmation copy in the form is what
 * actually protects against an accidental click.
 */
export async function deleteTeam(
  _prevState: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const parsed = deleteTeamSchema.safeParse({
    teamId: formData.get('teamId'),
  })

  if (!parsed.success) {
    return { status: 'error', message: 'Équipe invalide.' }
  }

  const { teamId } = parsed.data

  try {
    const actor = await requireSuperadmin()

    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { name: true, division: true, seasonId: true },
    })

    if (!team) {
      return { status: 'error', message: 'Cette équipe n’existe plus.' }
    }

    await db.team.delete({ where: { id: teamId } })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'TEAM_DELETED',
        entity: 'Team',
        entityId: teamId,
        before: team,
      },
    })

    revalidateAdminPages()
    updateTag(matchesTag(team.seasonId))

    return { status: 'saved', message: `Équipe « ${team.name} » supprimée.` }
  } catch (error) {
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
 * adjustable per fixture from the main admin page. Superadmin only.
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
    const actor = await requireSuperadmin()
    const season = await getCurrentSeason()

    if (!season) {
      return { status: 'error', message: 'Créez d’abord une saison.' }
    }

    const teams = await db.team.findMany({
      where: { id: { in: [homeTeamId, awayTeamId] } },
      select: { id: true, seasonId: true },
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

    revalidateAdminPages()
    updateTag(matchesTag(season.id))

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
