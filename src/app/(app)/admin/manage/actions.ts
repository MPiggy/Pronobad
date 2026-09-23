'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ForbiddenError, NotFoundError, requireSuperadmin } from '@/lib/auth/guards'
import { CURRENT_SEASON_TAG, getCurrentSeason } from '@/lib/seasons'
import { matchesTag } from '@/lib/predictions/queries'
import { DEFAULT_MAX_SCORE, maxScoreField } from '@/lib/predictions/score-field'
import { SETTINGS_ID, SETTINGS_TAG } from '@/lib/settings/queries'
import { parseParisDateTimeLocal } from '@/lib/format'
import { MAX_LOGO_UPLOAD_BYTES } from '@/lib/teams/logo'
import { InvalidLogoError, normalizeLogo } from '@/lib/teams/logo-image'
import type { FormState } from '@/lib/form-state'
import { Prisma } from '@/generated/prisma/client'

/**
 * Settings mutations: the season, its teams, and the competition format.
 *
 * Kept apart from `../actions.ts`, which handles fixtures and their results.
 * Everything here is the frame those fixtures sit in, and is superadmin-only.
 */

/** Turns a thrown guard error into a message the form can show. */
function toErrorState(error: unknown): FormState {
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
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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

/** What a team form asked of the logo. */
type LogoChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'set'; data: Uint8Array<ArrayBuffer> }

/**
 * Reads the form's `logo` file and `removeLogo` box.
 *
 * Call it only after the superadmin check: normalising an image is the most
 * expensive thing any action here does, and it is not offered to anyone else.
 * A chosen file wins over a ticked box — picking a new logo is a replacement.
 */
async function readLogoChange(
  formData: FormData,
): Promise<LogoChange | { kind: 'error'; message: string }> {
  const file = formData.get('logo')

  // An empty file input still submits a nameless, zero-byte File.
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LOGO_UPLOAD_BYTES) {
      return {
        kind: 'error',
        message: `Ce logo est trop lourd (${MAX_LOGO_UPLOAD_BYTES / 1024 / 1024} Mo maximum).`,
      }
    }

    try {
      const data = await normalizeLogo(new Uint8Array(await file.arrayBuffer()))
      return { kind: 'set', data }
    } catch (error) {
      if (error instanceof InvalidLogoError) {
        return { kind: 'error', message: error.message }
      }

      throw error
    }
  }

  return formData.get('removeLogo') === 'on' ? { kind: 'remove' } : { kind: 'keep' }
}

/** Creates a team in the current season. Superadmin only. */
export async function createTeam(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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

    const logo = await readLogoChange(formData)

    if (logo.kind === 'error') return { status: 'error', message: logo.message }

    await db.team.create({
      data: {
        seasonId: season.id,
        name,
        division,
        logo: logo.kind === 'set' ? { create: { data: logo.data } } : undefined,
      },
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

/** Renames a team, changes its division, and/or replaces or removes its logo. Superadmin only. */
export async function updateTeam(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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

    const logo = await readLogoChange(formData)

    if (logo.kind === 'error') return { status: 'error', message: logo.message }

    await db.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: teamId },
        data: { name, division },
      })

      if (logo.kind === 'set') {
        await tx.teamLogo.upsert({
          where: { teamId },
          create: { teamId, data: logo.data },
          update: { data: logo.data },
        })
      } else if (logo.kind === 'remove') {
        // `deleteMany`, not `delete`: removing a logo that is already gone
        // (a second tab, a double submit) is a no-op rather than an error.
        await tx.teamLogo.deleteMany({ where: { teamId } })
      }
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'TEAM_UPDATED',
        entity: 'Team',
        entityId: teamId,
        before,
        after: {
          name,
          division,
          seasonId: before.seasonId,
          // What happened to the image, not the image itself.
          ...(logo.kind === 'set' && { logo: 'replaced' }),
          ...(logo.kind === 'remove' && { logo: 'removed' }),
        },
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
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
// Competition settings

const settingsSchema = z.object({
  maxScore: maxScoreField,
})

/**
 * Sets the default number of rubbers a fixture is played over.
 *
 * Validation only ever runs on new entries, so changing it leaves every
 * result and prediction already filed standing — rewriting them would be
 * inventing scores to fix a typo in a setting. Those that no longer add up to
 * the new count are counted and reported back instead, so an admin changing
 * it by mistake finds out immediately rather than from a member.
 */
export async function updateMaxScore(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = settingsSchema.safeParse({
    maxScore: formData.get('maxScore'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Valeur invalide.',
    }
  }

  const { maxScore } = parsed.data

  try {
    const actor = await requireSuperadmin()

    // Read straight through, not via the cached `getMaxScore`: this value is
    // what the audit row records as the previous setting, and a stale read
    // would make the log say the cap moved from a value it never held.
    const current = await db.appSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { maxScore: true },
    })

    const before = current?.maxScore ?? DEFAULT_MAX_SCORE

    const label = `${maxScore} match${maxScore > 1 ? 's' : ''} par rencontre`

    if (before === maxScore) {
      return { status: 'saved', message: `Format inchangé : ${label}.` }
    }

    await db.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, maxScore },
      update: { maxScore },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MAX_SCORE_CHANGED',
        entity: 'AppSettings',
        entityId: SETTINGS_ID,
        before: { maxScore: before },
        after: { maxScore },
      },
    })

    revalidateAdminPages()
    updateTag(SETTINGS_TAG)

    // Scores on fixtures that follow the default and no longer add up to it.
    // Fixtures with their own count are unaffected. Raw SQL because Prisma
    // cannot express "column + column" in a `where`.
    const [[results], [predictions]] = await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Match"
        WHERE "maxScore" IS NULL
          AND "homeScore" IS NOT NULL
          AND "homeScore" + "awayScore" <> ${maxScore}
      `,
      db.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Prediction" p
        JOIN "Match" m ON m.id = p."matchId"
        WHERE m."maxScore" IS NULL
          AND p."homeScore" + p."awayScore" <> ${maxScore}
      `,
    ])

    const stale = Number(results?.count ?? 0) + Number(predictions?.count ?? 0)

    return {
      status: 'saved',
      message: `Format enregistré : ${label}.`,
      warning:
        stale === 0
          ? undefined
          : `${stale} score${stale > 1 ? 's' : ''} déjà saisi${stale > 1 ? 's' : ''} ne totalise${stale > 1 ? 'nt' : ''} plus ${maxScore} et reste${stale > 1 ? 'nt' : ''} inchangé${stale > 1 ? 's' : ''}.`,
    }
  } catch (error) {
    return toErrorState(error)
  }
}
