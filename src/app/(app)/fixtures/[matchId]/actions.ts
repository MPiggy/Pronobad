'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { matchesTag, matchTag } from '@/lib/predictions/queries'

/**
 * Submitting or editing a prediction.
 *
 * A server action is a public POST endpoint, not a private callback from the
 * page that rendered the form. So everything is re-established here — who the
 * caller is and whether the fixture is still open — rather than trusted from
 * the client. The form hiding itself after lock is a courtesy; this function
 * is the actual rule (PLAN.md § Locking).
 */

/**
 * An interclub fixture is played over a fixed number of rubbers, so scores are
 * small non-negative integers. The cap is deliberately loose rather than
 * pinned to a division's exact rubber count: formats differ between divisions
 * and a wrong cap would reject legitimate predictions.
 */
const MAX_SCORE = 20

const scoreField = z.coerce
  .number({ message: 'Indiquez un score.' })
  .int({ message: 'Le score doit être un nombre entier.' })
  .min(0, { message: 'Un score ne peut pas être négatif.' })
  .max(MAX_SCORE, { message: `Un score ne peut pas dépasser ${MAX_SCORE}.` })

const predictionSchema = z.object({
  matchId: z.string().min(1),
  homeScore: scoreField,
  awayScore: scoreField,
})

export type PredictionState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

export async function submitPrediction(
  _prevState: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const user = await requireOnboardedUser()

  const parsed = predictionSchema.safeParse({
    matchId: formData.get('matchId'),
    homeScore: formData.get('homeScore'),
    awayScore: formData.get('awayScore'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Pronostic invalide.',
    }
  }

  const { matchId, homeScore, awayScore } = parsed.data

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      seasonId: true,
      locksAt: true,
      resultEnteredAt: true,
    },
  })

  if (!match) {
    return { status: 'error', message: 'Cette rencontre n’existe pas.' }
  }

  // The authoritative lock check. The clock is read here, at write time, so a
  // form rendered before lock cannot be submitted after it.
  const state = lockState(match)

  if (state.locked) {
    return { status: 'error', message: explainLock(state) }
  }

  await db.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId: match.id } },
    create: {
      userId: user.id,
      matchId: match.id,
      // Taken from the fixture, never from the form: a prediction filed under
      // the wrong season would land on the wrong leaderboard.
      seasonId: match.seasonId,
      homeScore,
      awayScore,
    },
    update: { homeScore, awayScore },
  })

  // Both screens show the prediction back to the member immediately.
  updateTag(matchesTag(match.seasonId))
  updateTag(matchTag(match.id))

  return { status: 'saved' }
}
