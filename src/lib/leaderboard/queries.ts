import { db } from '@/lib/db'
import { ScoringRule } from '@/lib/scoring/rules'
import {
  rankLeaderboard,
  type LeaderboardEntry,
  type RankedEntry,
} from '@/lib/leaderboard/ranking'

/**
 * The per-club leaderboard for a season.
 *
 * Reads the frozen `PredictionScore` rows rather than recomputing points from
 * predictions and results (PLAN.md): the leaderboard must show what was
 * actually awarded, including for fixtures scored under an older scale.
 *
 * Scoped to one club — a global leaderboard is deliberately out of scope,
 * since members of different clubs predict different numbers of fixtures.
 */
export async function getClubLeaderboard({
  clubId,
  seasonId,
}: {
  clubId: string
  seasonId: string
}): Promise<RankedEntry[]> {
  const scores = await db.predictionScore.findMany({
    where: {
      seasonId,
      // Current membership, not membership at the time of the prediction: a
      // member who has left the club drops off their old club's table rather
      // than lingering on a leaderboard they can no longer add to.
      user: { clubId },
    },
    select: {
      userId: true,
      points: true,
      ruleApplied: true,
      user: { select: { name: true } },
    },
  })

  // Aggregated in application code rather than as a groupBy: the exact-score
  // count needs a conditional aggregate, which Prisma cannot express without
  // dropping to raw SQL. A club is ~50 members and a season a few dozen
  // fixtures, so this is a few hundred rows at most.
  const totals = new Map<string, LeaderboardEntry>()

  for (const score of scores) {
    const entry = totals.get(score.userId) ?? {
      userId: score.userId,
      name: score.user.name,
      points: 0,
      scoredCount: 0,
      exactCount: 0,
    }

    entry.points += score.points
    entry.scoredCount += 1
    if (score.ruleApplied === ScoringRule.ExactScore) entry.exactCount += 1

    totals.set(score.userId, entry)
  }

  return rankLeaderboard([...totals.values()])
}
