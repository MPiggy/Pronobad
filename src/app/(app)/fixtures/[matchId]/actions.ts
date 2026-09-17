'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { matchesTag, matchTag } from '@/lib/predictions/queries'
import {
  resolveMaxScore,
  scoreFieldFor,
  withPossibleScore,
} from '@/lib/predictions/score-field'
import { getMaxScore } from '@/lib/settings/queries'

/**
 * Submitting or editing a prediction.
 *
 * A server action is a public POST endpoint, not a private callback from the
 * page that rendered the form. So everything is re-established here — who the
 * caller is and whether the fixture is still open — rather than trusted from
 * the client. The form hiding itself after lock is a courtesy; this function
 * is the actual rule (PLAN.md § Locking).
 */

/** The fixture the prediction is for, before any score is looked at. */
const targetSchema = z.object({ matchId: z.string().min(1) })

/**
 * Built per call, not once at module load: the rubber count belongs to the
 * fixture, so a schema frozen at import time would enforce whichever value the
 * server happened to boot with. The `max` attribute and the linked inputs are
 * a courtesy — this is the rule.
 */
const scoreSchemaFor = (maxScore: number) =>
  withPossibleScore(
    z.object({
      homeScore: scoreFieldFor(maxScore),
      awayScore: scoreFieldFor(maxScore),
    }),
    maxScore,
  )

export type PredictionState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

export async function submitPrediction(
  _prevState: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const user = await requireOnboardedUser()

  const target = targetSchema.safeParse({ matchId: formData.get('matchId') })

  if (!target.success) {
    return { status: 'error', message: 'Rencontre invalide.' }
  }

  // The fixture is loaded before the scores are parsed, because it carries the
  // rubber count they have to be judged against.
  const match = await db.match.findUnique({
    where: { id: target.data.matchId },
    select: {
      id: true,
      seasonId: true,
      locksAt: true,
      resultEnteredAt: true,
      maxScore: true,
    },
  })

  if (!match) {
    return { status: 'error', message: 'Cette rencontre n’existe pas.' }
  }

  // The authoritative lock check, before validation so a member is told the
  // fixture is closed rather than nitpicked about a score that cannot be saved
  // either way. The clock is read here, at write time, so a form rendered
  // before lock cannot be submitted after it.
  const state = lockState(match)

  if (state.locked) {
    return { status: 'error', message: explainLock(state) }
  }

  const maxScore = resolveMaxScore(match.maxScore, await getMaxScore())
  const parsed = scoreSchemaFor(maxScore).safeParse({
    homeScore: formData.get('homeScore'),
    awayScore: formData.get('awayScore'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Pronostic invalide.',
    }
  }

  const { homeScore, awayScore } = parsed.data

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
