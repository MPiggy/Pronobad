import { db, type TransactionClient } from '@/lib/db'
import { scorePrediction } from '@/lib/scoring/rules'

/**
 * Freezes points into `PredictionScore` when a fixture's result is entered.
 *
 * Points are stored, never computed on read (PLAN.md): the scoring scale can
 * then change without rewriting history, and a member can be shown exactly why
 * they scored what they did.
 *
 * Takes the Prisma client to run on, so a caller that is already inside a
 * transaction — entering a result also updates the match and writes an audit
 * row — can pass its own and keep the whole operation atomic. A fixture left
 * FINISHED but unscored would show a leaderboard that is wrong in a way
 * nobody would notice.
 */
export async function scoreMatch(
  matchId: string,
  client: TransactionClient = db,
): Promise<{ scored: number }> {
  const match = await client.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      seasonId: true,
      homeScore: true,
      awayScore: true,
    },
  })

  if (!match) {
    throw new Error(`Cannot score unknown match ${matchId}.`)
  }

  const { homeScore, awayScore } = match

  // Callers should only score finished fixtures; being explicit turns a
  // mistake into a clear error rather than silently scoring against null.
  if (homeScore === null || awayScore === null) {
    throw new Error(`Match ${matchId} has no result to score against.`)
  }

  const result = { homeScore, awayScore }

  const predictions = await client.prediction.findMany({
    where: { matchId },
    select: { id: true, userId: true, homeScore: true, awayScore: true },
  })

  const scores = predictions.map((prediction) => ({
    predictionId: prediction.id,
    userId: prediction.userId,
    seasonId: match.seasonId,
    ...scorePrediction(
      { homeScore: prediction.homeScore, awayScore: prediction.awayScore },
      result,
    ),
  }))

  // Sequential rather than `$transaction([...])`: `client` is often already a
  // transaction (transactions do not nest), and the caller owns the atomicity
  // boundary either way.
  for (const score of scores) {
    // Upsert rather than create: an admin correcting a wrong result re-runs
    // this, and the second run must overwrite the first rather than fail or
    // double-count. `computedAt` moves so the correction is visible.
    await client.predictionScore.upsert({
      where: { predictionId: score.predictionId },
      create: score,
      update: {
        points: score.points,
        ruleApplied: score.ruleApplied,
        seasonId: score.seasonId,
        computedAt: new Date(),
      },
    })
  }

  return { scored: scores.length }
}

/**
 * Removes the frozen scores for a fixture.
 *
 * Used when a result is withdrawn — entered against the wrong fixture, say.
 * Leaving the scores behind would keep phantom points on the leaderboard for a
 * fixture that no longer has a result.
 */
export async function unscoreMatch(
  matchId: string,
  client: TransactionClient = db,
): Promise<{ removed: number }> {
  const { count } = await client.predictionScore.deleteMany({
    where: { prediction: { matchId } },
  })

  return { removed: count }
}
