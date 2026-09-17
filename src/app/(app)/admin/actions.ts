'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ForbiddenError, NotFoundError, requireMatchManager } from '@/lib/auth/guards'
import { scoreMatch, unscoreMatch } from '@/lib/scoring/engine'
import { parseParisDateTimeLocal } from '@/lib/format'
import { matchesTag, matchTag } from '@/lib/predictions/queries'
import {
  optionalMaxScoreField,
  resolveMaxScore,
  scoreFieldFor,
  withPossibleScore,
} from '@/lib/predictions/score-field'
import { getMaxScore } from '@/lib/settings/queries'
import { leaderboardTag } from '@/lib/leaderboard/queries'
import { MatchStatus } from '@/generated/prisma/enums'

/**
 * Admin mutations: entering a result, moving `locksAt`, and rescheduling.
 *
 * These are the actions that can silently rewrite a leaderboard, so each is
 * permission-checked server-side and each writes an AuditLog row (PLAN.md
 * § Roles & Permissions). `requireMatchManager` is the boundary — the admin UI
 * being hidden from members is not access control.
 */

export type AdminState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string }

/** Turns a thrown guard error into a message the form can show. */
function toErrorState(error: unknown): AdminState {
  if (error instanceof ForbiddenError || error instanceof NotFoundError) {
    return { status: 'error', message: error.message }
  }

  throw error
}

/** The fixture the result belongs to, before any score is looked at. */
const targetSchema = z.object({ matchId: z.string().min(1) })

const matchMaxScoreSchema = z.object({
  matchId: z.string().min(1),
  maxScore: optionalMaxScoreField,
})

/**
 * Overrides how many rubbers one fixture is played over, or clears the
 * override so it follows the competition default again.
 *
 * Changing this after predictions are in does not rewrite them: a 5-3 filed
 * when the fixture was 8 rubbers is still what that member predicted, and
 * silently turning it into something else would be inventing a prediction they
 * never made. They are counted and reported instead, so an admin can see that
 * some members now need to re-enter a scoreline that has become impossible.
 */
export async function updateMatchMaxScore(
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = matchMaxScoreSchema.safeParse({
    matchId: formData.get('matchId'),
    maxScore: formData.get('maxScore'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Valeur invalide.',
    }
  }

  const { matchId, maxScore } = parsed.data

  try {
    const actor = await requireMatchManager(matchId)

    const before = await db.match.findUnique({
      where: { id: matchId },
      select: { seasonId: true, maxScore: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    await db.match.update({
      where: { id: matchId },
      data: { maxScore },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MATCH_MAX_SCORE_CHANGED',
        entity: 'Match',
        entityId: matchId,
        before: { maxScore: before.maxScore },
        after: { maxScore },
      },
    })

    revalidatePath('/admin')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(matchId))

    const effective = resolveMaxScore(maxScore, await getMaxScore())

    // Predictions whose two scores no longer add up to the rubber count. Done
    // with a raw comparison because Prisma cannot express "column + column" in
    // a `where`.
    const [stranded] = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Prediction"
      WHERE "matchId" = ${matchId}
        AND "homeScore" + "awayScore" <> ${effective}
    `

    const count = Number(stranded?.count ?? 0)
    const scope = maxScore === null ? 'défaut' : `${maxScore} matchs`

    return {
      status: 'saved',
      message:
        count === 0
          ? `Rencontre en ${effective} matchs (${scope}).`
          : `Rencontre en ${effective} matchs (${scope}). ${count} pronostic${count > 1 ? 's' : ''} ne tota${count > 1 ? 'lisent' : 'lise'} plus ${effective} et ${count > 1 ? 'doivent' : 'doit'} être ressaisi${count > 1 ? 's' : ''}.`,
    }
  } catch (error) {
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
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
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
      message: `Résultat enregistré. ${scored} pronostic${scored > 1 ? 's' : ''} noté${scored > 1 ? 's' : ''}.`,
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
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
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

    return { status: 'saved', message: 'Résultat retiré.' }
  } catch (error) {
    return toErrorState(error)
  }
}

const locksAtSchema = z.object({
  matchId: z.string().min(1),
  // `datetime-local` posts "2026-11-15T18:00" with no zone. Interpreted as the
  // server's zone by `new Date()`, which is UTC on Vercel — so it is parsed
  // explicitly against Europe/Paris below rather than trusted directly.
  locksAt: z.string().min(1, { message: 'Indiquez une date de fermeture.' }),
})

/**
 * Moves a fixture's prediction deadline.
 *
 * Audited with particular care: this is the one setting that can reopen a
 * closed prediction window, so "why was my prediction overwritten" has an
 * answer (PLAN.md).
 */
export async function updateLocksAt(
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = locksAtSchema.safeParse({
    matchId: formData.get('matchId'),
    locksAt: formData.get('locksAt'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Date invalide.',
    }
  }

  const locksAt = parseParisDateTimeLocal(parsed.data.locksAt)

  if (!locksAt || Number.isNaN(locksAt.getTime())) {
    return { status: 'error', message: 'Date de fermeture invalide.' }
  }

  try {
    const actor = await requireMatchManager(parsed.data.matchId)

    const before = await db.match.findUnique({
      where: { id: parsed.data.matchId },
      select: { seasonId: true, locksAt: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    await db.match.update({
      where: { id: parsed.data.matchId },
      data: { locksAt },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'LOCKS_AT_CHANGED',
        entity: 'Match',
        entityId: parsed.data.matchId,
        before: { locksAt: before.locksAt.toISOString() },
        after: { locksAt: locksAt.toISOString() },
      },
    })

    revalidatePath('/admin')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(parsed.data.matchId))

    return { status: 'saved', message: 'Fermeture des pronostics mise à jour.' }
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
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
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
    revalidatePath('/admin/manage')
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
          ? `Rencontre « ${label} » supprimée.`
          : `Rencontre « ${label} » supprimée, avec ${predictions} pronostic${predictions > 1 ? 's' : ''} et ${points} point${points > 1 ? 's' : ''} au classement.`,
    }
  } catch (error) {
    return toErrorState(error)
  }
}

const playedAtSchema = z.object({
  matchId: z.string().min(1),
  // Same `datetime-local` caveat as `locksAt` above: no zone is posted, so the
  // value is parsed explicitly against Europe/Paris rather than by `new Date()`.
  playedAt: z.string().min(1, { message: 'Indiquez une date de rencontre.' }),
})

/**
 * Reschedules a fixture.
 *
 * Interclub fixtures get postponed, which is why `playedAt` exists as its own
 * column — but a postponement that left `locksAt` behind would close
 * predictions weeks before the fixture is actually played. So the deadline
 * always follows the new date, and an admin who wants a different one sets it
 * afterwards with `updateLocksAt`.
 *
 * Both values land in one audit row: this can reopen a prediction window that
 * had already closed, and "why is this fixture open again" needs an answer.
 */
export async function updateMatchDate(
  _prevState: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = playedAtSchema.safeParse({
    matchId: formData.get('matchId'),
    playedAt: formData.get('playedAt'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Date invalide.',
    }
  }

  const playedAt = parseParisDateTimeLocal(parsed.data.playedAt)

  if (!playedAt || Number.isNaN(playedAt.getTime())) {
    return { status: 'error', message: 'Date de rencontre invalide.' }
  }

  try {
    const actor = await requireMatchManager(parsed.data.matchId)

    const before = await db.match.findUnique({
      where: { id: parsed.data.matchId },
      select: { seasonId: true, playedAt: true, locksAt: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    await db.match.update({
      where: { id: parsed.data.matchId },
      data: { playedAt, locksAt: playedAt },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'MATCH_DATE_CHANGED',
        entity: 'Match',
        entityId: parsed.data.matchId,
        before: {
          playedAt: before.playedAt.toISOString(),
          locksAt: before.locksAt.toISOString(),
        },
        after: {
          playedAt: playedAt.toISOString(),
          locksAt: playedAt.toISOString(),
        },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/manage')
    updateTag(matchesTag(before.seasonId))
    updateTag(matchTag(parsed.data.matchId))

    return {
      status: 'saved',
      message:
        'Date mise à jour. Les pronostics ferment désormais au coup d’envoi.',
    }
  } catch (error) {
    return toErrorState(error)
  }
}
