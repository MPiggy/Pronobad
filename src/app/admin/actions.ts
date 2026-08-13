'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ForbiddenError, NotFoundError, requireMatchManager } from '@/lib/auth/guards'
import { scoreMatch, unscoreMatch } from '@/lib/scoring/engine'
import { parseParisDateTimeLocal } from '@/lib/format'
import { MatchStatus } from '@/generated/prisma/enums'

/**
 * Admin mutations: entering a result, and moving `locksAt`.
 *
 * These are the two actions that can silently rewrite a leaderboard, so both
 * are permission-checked server-side and both write an AuditLog row (PLAN.md
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

const MAX_SCORE = 20

const scoreField = z.coerce
  .number({ message: 'Indiquez un score.' })
  .int({ message: 'Le score doit être un nombre entier.' })
  .min(0, { message: 'Un score ne peut pas être négatif.' })
  .max(MAX_SCORE, { message: `Un score ne peut pas dépasser ${MAX_SCORE}.` })

const resultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: scoreField,
  awayScore: scoreField,
})

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
  const parsed = resultSchema.safeParse({
    matchId: formData.get('matchId'),
    homeScore: formData.get('homeScore'),
    awayScore: formData.get('awayScore'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Résultat invalide.',
    }
  }

  const { matchId, homeScore, awayScore } = parsed.data

  try {
    const actor = await requireMatchManager(matchId)

    const before = await db.match.findUnique({
      where: { id: matchId },
      select: { homeScore: true, awayScore: true, status: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    await db.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: MatchStatus.FINISHED,
        // Set on first entry only: this doubles as a lock (a fixture with a
        // result never reopens for predictions), so a correction must not
        // look like a fresh entry.
        resultEnteredAt: new Date(),
      },
    })

    // Scoring runs after the result is committed, so the points are always
    // computed against what is actually stored.
    const { scored } = await scoreMatch(matchId)

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: before.homeScore === null ? 'RESULT_ENTERED' : 'RESULT_CORRECTED',
        entity: 'Match',
        entityId: matchId,
        before,
        after: { homeScore, awayScore, status: MatchStatus.FINISHED },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/fixtures')
    revalidatePath('/leaderboard')
    revalidatePath('/profile')
    revalidatePath(`/fixtures/${matchId}`)

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
      select: { homeScore: true, awayScore: true, status: true },
    })

    if (!before) return { status: 'error', message: 'Cette rencontre n’existe pas.' }

    const { removed } = await unscoreMatch(matchId.data)

    await db.match.update({
      where: { id: matchId.data },
      data: {
        homeScore: null,
        awayScore: null,
        status: MatchStatus.UPCOMING,
        resultEnteredAt: null,
      },
    })

    await db.auditLog.create({
      data: {
        userId: actor.id,
        action: 'RESULT_WITHDRAWN',
        entity: 'Match',
        entityId: matchId.data,
        before,
        after: { homeScore: null, awayScore: null, removedScores: removed },
      },
    })

    revalidatePath('/admin')
    revalidatePath('/fixtures')
    revalidatePath('/leaderboard')
    revalidatePath('/profile')
    revalidatePath(`/fixtures/${matchId.data}`)

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
      select: { locksAt: true },
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
    revalidatePath('/fixtures')
    revalidatePath(`/fixtures/${parsed.data.matchId}`)

    return { status: 'saved', message: 'Fermeture des pronostics mise à jour.' }
  } catch (error) {
    return toErrorState(error)
  }
}
