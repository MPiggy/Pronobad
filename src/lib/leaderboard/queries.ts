import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { ScoringRule } from '@/lib/scoring/rules'
import {
  rankLeaderboard,
  type LeaderboardEntry,
  type RankedEntry,
} from '@/lib/leaderboard/ranking'

/** Tag for a season's leaderboard — busted whenever a result is entered/withdrawn. */
export const leaderboardTag = (seasonId: string) => `leaderboard-${seasonId}`

/**
 * The leaderboard for a season.
 *
 * Reads the frozen `PredictionScore` rows rather than recomputing points from
 * predictions and results (PLAN.md): the leaderboard must show what was
 * actually awarded, including for fixtures scored under an older scale.
 */
export async function getLeaderboard({
  seasonId,
}: {
  seasonId: string
}): Promise<RankedEntry[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(leaderboardTag(seasonId))

  const scores = await db.predictionScore.findMany({
    where: { seasonId },
    select: {
      userId: true,
      points: true,
      ruleApplied: true,
      user: { select: { name: true } },
    },
  })

  // Aggregated in application code rather than as a groupBy: the exact-score
  // count needs a conditional aggregate, which Prisma cannot express without
  // dropping to raw SQL. A season is a few hundred rows at most.
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
