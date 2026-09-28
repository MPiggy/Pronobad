import { ScoringRule, type Score } from '@/lib/scoring/rules'

/**
 * How the members bet on one fixture, for the admin's stats panel.
 *
 * A pure function over already-loaded predictions, so the arithmetic — shares
 * that round, ties between popular scores — is tested without a database.
 */

export type BetForStats = Score & {
  /** The frozen points, once a result is in; null before. */
  score: { points: number; ruleApplied: string } | null
}

export type ScoreCount = Score & { count: number }

export type PredictionStats = {
  total: number
  /** How many predicted each outcome — a home win, a draw, an away win. */
  outcomes: { home: number; draw: number; away: number }
  /** The mean predicted score per side, or null with no predictions. */
  average: { homeScore: number; awayScore: number } | null
  /** The most-predicted scores, most popular first. */
  topScores: ScoreCount[]
  /** How the scored predictions fared; all zero until a result is entered. */
  rules: { exact: number; outcome: number; wrong: number }
  /** Points handed out on this fixture, summed over every member. */
  pointsAwarded: number
}

export function summarizePredictions(
  bets: BetForStats[],
  { topScoreLimit = 5 }: { topScoreLimit?: number } = {},
): PredictionStats {
  const outcomes = { home: 0, draw: 0, away: 0 }
  const rules = { exact: 0, outcome: 0, wrong: 0 }
  const scoreCounts = new Map<string, ScoreCount>()
  let homeSum = 0
  let awaySum = 0
  let pointsAwarded = 0

  for (const bet of bets) {
    if (bet.homeScore > bet.awayScore) outcomes.home++
    else if (bet.homeScore < bet.awayScore) outcomes.away++
    else outcomes.draw++

    homeSum += bet.homeScore
    awaySum += bet.awayScore

    const key = `${bet.homeScore}-${bet.awayScore}`
    const entry = scoreCounts.get(key)
    if (entry) entry.count++
    else
      scoreCounts.set(key, {
        homeScore: bet.homeScore,
        awayScore: bet.awayScore,
        count: 1,
      })

    if (bet.score) {
      pointsAwarded += bet.score.points
      if (bet.score.ruleApplied === ScoringRule.ExactScore) rules.exact++
      else if (bet.score.ruleApplied === ScoringRule.CorrectOutcome) rules.outcome++
      else rules.wrong++
    }
  }

  // Ties read home-heavy first, so the list runs in the same direction as a
  // scoreline and doesn't reshuffle between renders.
  const topScores = [...scoreCounts.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.homeScore - a.homeScore ||
        a.awayScore - b.awayScore,
    )
    .slice(0, topScoreLimit)

  const total = bets.length

  return {
    total,
    outcomes,
    average:
      total === 0
        ? null
        : { homeScore: homeSum / total, awayScore: awaySum / total },
    topScores,
    rules,
    pointsAwarded,
  }
}

/**
 * Whole-number percentages of `total` that add up to exactly 100.
 *
 * Rounding each share on its own can print 33 % + 33 % + 33 %; the leftover
 * points go to the shares with the largest remainders instead.
 */
export function percentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) return counts.map(() => 0)

  const exact = counts.map((count) => (count / total) * 100)
  const floored = exact.map(Math.floor)
  let leftover = 100 - floored.reduce((sum, value) => sum + value, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)

  for (const { index } of byRemainder) {
    if (leftover === 0) break
    floored[index] = (floored[index] ?? 0) + 1
    leftover--
  }

  return floored
}
