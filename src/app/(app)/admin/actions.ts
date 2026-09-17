'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  ForbiddenError,
  NotFoundError,
  requireMatchManager,
  requireSuperadmin,
} from '@/lib/auth/guards'
import { scoreMatch, unscoreMatch } from '@/lib/scoring/engine'
import { matchesTag, matchTag } from '@/lib/predictions/queries'
import {
  resolveMaxScore,
  scoreFieldFor,
  withPossibleScore,
} from '@/lib/predictions/score-field'
import { getMaxScore } from '@/lib/settings/queries'
import { getCurrentSeason } from '@/lib/seasons'
import { leaderboardTag } from '@/lib/leaderboard/queries'
import { parseFixtureFields, type FixtureFields } from '@/lib/fixtures/fixture-fields'
import type { FormState } from '@/lib/form-state'
import { MatchStatus } from '@/generated/prisma/enums'
import { Prisma } from '@/generated/prisma/client'

/**
 * Fixture mutations: creating and editing a fixture, entering its result,
 * deleting it.
 *
 * These are the actions that can silently rewrite a leaderboard, so each is
 * permission-checked server-side and each writes an AuditLog row (PLAN.md
 * § Roles & Permissions). The guards are the boundary — the admin UI being
 * hidden from members is not access control.
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

/** The fixture an action targets, before anything else is looked at. */
const targetSchema = z.object({ matchId: z.string().min(1) })

/**
 * Both teams must exist and belong to the season the fixture is in — a team
 * id posted from a stale page could otherwise pair last season's team with
 * this season's fixture.
 */
async function checkTeams(
  seasonId: string,
  { homeTeamId, awayTeamId }: FixtureFields,
): Promise<FormState | null> {
  const teams = await db.team.findMany({
    where: { id: { in: [homeTeamId, awayTeamId] } },
    select: { id: true, seasonId: true },
  })

  const home = teams.find((team) => team.id === homeTeamId)
  const away = teams.find((team) => team.id === awayTeamId)

  if (!home || !away) {
    return { status: 'error', message: 'L’une des deux équipes n’existe pas.' }
  }

  if (home.seasonId !== seasonId || away.seasonId !== seasonId) {
    return {
      status: 'error',
      message: 'Les deux équipes doivent appartenir à la saison en cours.',
    }
  }

  return null
}

/**
 * Predictions whose two scores no longer add up to the fixture's rubber count.
 *
 * Changing the count after predictions are in does not rewrite them: a 5-3
 * filed when the fixture was 8 rubbers is still what that member predicted,
 * and silently turning it into something else would be inventing a prediction
 * they never made. They are counted and reported instead, so the admin can see
 * that some members need to re-enter a scoreline that has become impossible.
 *
 * A raw query because Prisma cannot express "column + column" in a `where`.
 */
async function countStrandedPredictions(
  matchId: string,
  maxScore: number,
): Promise<number> {
  const [row] = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Prediction"
    WHERE "matchId" = ${matchId}
      AND "homeScore" + "awayScore" <> ${maxScore}
  `

  return Number(row?.count ?? 0)
}

function strandedWarning(count: number, maxScore: number): string | undefined {
  if (count === 0) return undefined

  return count === 1
    ? `1 pronostic ne totalise plus ${maxScore} et doit être ressaisi par son auteur.`
    : `${count} pronostics ne totalisent plus ${maxScore} et doivent être ressaisis par leurs auteurs.`
}

/**
 * Creates a fixture in the current season.
 *
 * Every field is set here, deadline and rubber count included — a fixture
 * should not need a second visit to a second form to be complete.
 */
export async function createMatch(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseFixtureFields(formData)

  if (!parsed.ok) return { status: 'error', message: parsed.message }

  const { fixture } = parsed

  try {
    const actor = await requireSuperadmin()
    const season = await getCurrentSeason()

    if (!season) {
      return { status: 'error', message: 'Créez d’abord une saison.' }
    }

    const teamError = await checkTeams(season.id, fixture)
    if (teamError) return teamError

    const match = await db.match.create({
      data: { seasonId: season.id, ...fixture },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MATCH_CREATED',
        entity: 'Match',
        entityId: match.id,
        after: {
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          round: fixture.round,
          playedAt: fixture.playedAt.toISOString(),
          locksAt: fixture.locksAt.toISOString(),
          maxScore: fixture.maxScore,
        },
      },
    })

    revalidatePath('/admin')
    updateTag(matchesTag(season.id))

    return { status: 'saved', message: 'Rencontre créée.' }
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

/**
 * Saves every editable field of a fixture at once.
 *
 * One audit row per save, holding only what changed. `locksAt` is in there
 * whenever it moved: it is the one setting that can reopen a closed prediction
 * window, so "why is this fixture open again" always has an answer (PLAN.md).
 */
export async function updateMatch(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const target = targetSchema.safeParse({ matchId: formData.get('matchId') })

  if (!target.success) return { status: 'error', message: 'Rencontre invalide.' }

  const parsed = parseFixtureFields(formData)

  if (!parsed.ok) return { status: 'error', message: parsed.message }

  const { matchId } = target.data
  const { fixture } = parsed

  try {
    const actor = await requireMatchManager(matchId)

    const before = await db.match.findUnique({
      where: { id: matchId },
      select: {
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        round: true,
        playedAt: true,
        locksAt: true,
        maxScore: true,
      },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    const teamError = await checkTeams(before.seasonId, fixture)
    if (teamError) return teamError

    // Only what actually moved goes in the audit row — a row that repeats
    // every unchanged column hides the one that changed.
    type AuditValue = string | number | null
    const changedBefore: Record<string, AuditValue> = {}
    const changedAfter: Record<string, AuditValue> = {}

    const compare = <K extends keyof FixtureFields>(
      key: K,
      serialise: (value: FixtureFields[K]) => AuditValue = (value) =>
        value as AuditValue,
    ) => {
      const previous = serialise(before[key] as FixtureFields[K])
      const next = serialise(fixture[key])
      if (previous !== next) {
        changedBefore[key] = previous
        changedAfter[key] = next
      }
    }

    compare('homeTeamId')
    compare('awayTeamId')
    compare('round')
    compare('playedAt', (date) => date.toISOString())
    compare('locksAt', (date) => date.toISOString())
    compare('maxScore')

    if (Object.keys(changedAfter).length === 0) {
      return { status: 'saved', message: 'Aucune modification.' }
    }

    await db.match.update({ where: { id: matchId }, data: fixture })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MATCH_UPDATED',
        entity: 'Match',
        entityId: matchId,
        before: changedBefore,
        after: changedAfter,
      },
    })

    revalidatePath('/admin')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(matchId))

    let warning: string | undefined

    if ('maxScore' in changedAfter) {
      const effective = resolveMaxScore(fixture.maxScore, await getMaxScore())
      warning = strandedWarning(
        await countStrandedPredictions(matchId, effective),
        effective,
      )
    }

    return { status: 'saved', message: 'Rencontre mise à jour.', warning }
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

/**
 * Built per call rather than once at module load: the rubber count belongs to
 * the fixture, so a schema frozen at import time would enforce whichever value
 * the server happened to boot with.
 */
const resultSchemaFor = (maxScore: number) =>
  withPossibleScore(
    z.object({
      homeScore: scoreFieldFor(maxScore),
      awayScore: scoreFieldFor(maxScore),
    }),
    maxScore,
  )

/**
 * Records a fixture's official result and freezes the points.
 *
 * Re-runnable: correcting a wrong result re-scores every prediction rather
 * than double-counting, because the engine upserts on `predictionId`.
 */
export async function enterResult(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const target = targetSchema.safeParse({ matchId: formData.get('matchId') })

  if (!target.success) {
    return { status: 'error', message: 'Rencontre invalide.' }
  }

  const matchId = target.data.matchId

  try {
    const actor = await requireMatchManager(matchId)

    // Loaded before the scores are parsed: the fixture carries the rubber
    // count they have to be judged against.
    const before = await db.match.findUnique({
      where: { id: matchId },
      select: {
        seasonId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        resultEnteredAt: true,
        maxScore: true,
      },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    const parsed = resultSchemaFor(
      resolveMaxScore(before.maxScore, await getMaxScore()),
    ).safeParse({
      homeScore: formData.get('homeScore'),
      awayScore: formData.get('awayScore'),
    })

    if (!parsed.success) {
      return {
        status: 'error',
        message: parsed.error.issues[0]?.message ?? 'Résultat invalide.',
      }
    }

    const { homeScore, awayScore } = parsed.data

    // `resultEnteredAt` is a Date; the audit columns are Json, so it is
    // recorded as an ISO string like every other timestamp in this file.
    const auditBefore = {
      seasonId: before.seasonId,
      homeScore: before.homeScore,
      awayScore: before.awayScore,
      status: before.status,
      resultEnteredAt: before.resultEnteredAt?.toISOString() ?? null,
    }

    // The result, the points it freezes, and the audit row are one operation:
    // a failure between them would leave a FINISHED fixture whose predictions
    // are unscored — a leaderboard silently missing points — or an untraceable
    // rewrite of one.
    const { scored } = await db.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          homeScore,
          awayScore,
          status: MatchStatus.FINISHED,
          // Set on first entry only: this doubles as a lock (a fixture with a
          // result never reopens for predictions), so a correction must not
          // look like a fresh entry — and must keep the original timestamp.
          resultEnteredAt: before.resultEnteredAt ?? new Date(),
        },
      })

      // Scoring runs after the result is written, so the points are always
      // computed against what is actually stored.
      const result = await scoreMatch(matchId, tx)

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: before.homeScore === null ? 'RESULT_ENTERED' : 'RESULT_CORRECTED',
          entity: 'Match',
          entityId: matchId,
          before: auditBefore,
          after: { homeScore, awayScore, status: MatchStatus.FINISHED },
        },
      })

      return result
    })

    revalidatePath('/admin')
    revalidatePath('/profile')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(matchId))
    updateTag(leaderboardTag(before.seasonId))

    return {
      status: 'saved',
      message: `Résultat enregistré · ${scored} pronostic${scored > 1 ? 's' : ''} noté${scored > 1 ? 's' : ''}`,
    }
  } catch (error) {
    return toErrorState(error)
  }
}

/**
 * Withdraws a result entered by mistake.
 *
 * Removes the frozen scores too — leaving them would keep phantom points on
 * the leaderboard for a fixture that no longer has a result.
 */
export async function withdrawResult(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchId = z.string().min(1).safeParse(formData.get('matchId'))

  if (!matchId.success) {
    return { status: 'error', message: 'Rencontre invalide.' }
  }

  try {
    const actor = await requireMatchManager(matchId.data)

    const before = await db.match.findUnique({
      where: { id: matchId.data },
      select: { seasonId: true, homeScore: true, awayScore: true, status: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    // One operation, for the mirror image of the reason `enterResult` is: the
    // scores must not be deleted while the result they were computed from is
    // still standing, and the withdrawal must not go unrecorded.
    await db.$transaction(async (tx) => {
      const { removed } = await unscoreMatch(matchId.data, tx)

      await tx.match.update({
        where: { id: matchId.data },
        data: {
          homeScore: null,
          awayScore: null,
          status: MatchStatus.UPCOMING,
          resultEnteredAt: null,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'RESULT_WITHDRAWN',
          entity: 'Match',
          entityId: matchId.data,
          before,
          after: { homeScore: null, awayScore: null, removedScores: removed },
        },
      })
    })

    revalidatePath('/admin')
    revalidatePath('/profile')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(matchId.data))
    updateTag(leaderboardTag(before.seasonId))

    return { status: 'saved', message: 'Résultat retiré' }
  } catch (error) {
    return toErrorState(error)
  }
}

/**
 * Deletes a fixture, and with it every prediction on it and every point those
 * predictions earned.
 *
 * The points go through the schema's `onDelete: Cascade` chain — Match →
 * Prediction → PredictionScore — rather than a hand-rolled sweep, so there is
 * no window in which a prediction survives the fixture it belongs to, or a
 * frozen score survives its prediction. Leaving either behind would keep
 * phantom points on the leaderboard for a fixture that no longer exists.
 *
 * What is lost is counted *before* the delete and written to the AuditLog:
 * `entityId` is a plain string with no foreign key, so the audit row outlives
 * the fixture and stays the only record that it ever existed.
 */
export async function deleteMatch(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const matchId = z.string().min(1).safeParse(formData.get('matchId'))

  if (!matchId.success) {
    return { status: 'error', message: 'Rencontre invalide.' }
  }

  try {
    const actor = await requireMatchManager(matchId.data)

    const before = await db.match.findUnique({
      where: { id: matchId.data },
      select: {
        seasonId: true,
        round: true,
        playedAt: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    const label = `${before.homeTeam.name} — ${before.awayTeam.name}`

    // Counting and deleting in one transaction: a prediction filed between the
    // count and the delete would otherwise vanish without appearing in the
    // audit row, which is the only trace left once the fixture is gone.
    const { predictions, points } = await db.$transaction(async (tx) => {
      const [predictions, awarded] = await Promise.all([
        tx.prediction.count({ where: { matchId: matchId.data } }),
        tx.predictionScore.aggregate({
          where: { prediction: { matchId: matchId.data } },
          _sum: { points: true },
          _count: true,
        }),
      ])

      await tx.match.delete({ where: { id: matchId.data } })

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: 'MATCH_DELETED',
          entity: 'Match',
          entityId: matchId.data,
          before: {
            seasonId: before.seasonId,
            round: before.round,
            playedAt: before.playedAt.toISOString(),
            homeTeam: before.homeTeam.name,
            awayTeam: before.awayTeam.name,
            homeScore: before.homeScore,
            awayScore: before.awayScore,
            deletedPredictions: predictions,
            deletedScores: awarded._count,
            deletedPoints: awarded._sum.points ?? 0,
          },
        },
      })

      return { predictions, points: awarded._sum.points ?? 0 }
    })

    revalidatePath('/admin')
    revalidatePath('/profile')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(matchId.data))
    // The frozen scores went with it, so the leaderboard is now wrong until
    // this is busted.
    updateTag(leaderboardTag(before.seasonId))

    return {
      status: 'saved',
      message:
        predictions === 0
          ? `« ${label} » supprimée`
          : `« ${label} » supprimée · ${predictions} pronostic${predictions > 1 ? 's' : ''}, ${points} point${points > 1 ? 's' : ''}`,
    }
  } catch (error) {
    return toErrorState(error)
  }
}
