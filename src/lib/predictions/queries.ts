import { db } from '@/lib/db'

/**
 * Reads for the member-facing prediction screens.
 *
 * Kept out of the pages so the shape of "a fixture with my prediction on it"
 * is defined once. Each fixture carries at most one prediction — the caller's —
 * because `Prediction` is unique on (userId, matchId) and every query below
 * filters by user. Other members' predictions are deliberately never selected:
 * they would leak before lock, and the leaderboard is the place they surface.
 */

const matchWithPredictionSelect = (userId: string) =>
  ({
    id: true,
    playedAt: true,
    locksAt: true,
    status: true,
    homeScore: true,
    awayScore: true,
    resultEnteredAt: true,
    homeTeam: { select: { name: true } },
    awayTeam: { select: { name: true } },
    predictions: {
      where: { userId },
      select: {
        homeScore: true,
        awayScore: true,
        score: { select: { points: true, ruleApplied: true } },
      },
    },
  }) as const

/** Flattens Prisma's `predictions: [row]` into the single `prediction` the UI wants. */
function withPrediction<
  T extends {
    predictions: {
      homeScore: number
      awayScore: number
      score: { points: number; ruleApplied: string } | null
    }[]
  },
>(match: T) {
  const { predictions, ...rest } = match

  return { ...rest, prediction: predictions[0] ?? null }
}

/**
 * Every fixture of the season, with the member's own prediction.
 *
 * Ordered by date ascending; the page splits them into upcoming and past
 * rather than running two queries, since a season is a few dozen rows.
 */
export async function getMatchesForUser({
  seasonId,
  userId,
}: {
  seasonId: string
  userId: string
}) {
  const matches = await db.match.findMany({
    where: { seasonId },
    select: matchWithPredictionSelect(userId),
    orderBy: { playedAt: 'asc' },
  })

  return matches.map(withPrediction)
}

/** One fixture, with the caller's prediction. */
export async function getMatchForUser({
  matchId,
  userId,
}: {
  matchId: string
  userId: string
}) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      ...matchWithPredictionSelect(userId),
      seasonId: true,
      round: true,
      homeTeam: { select: { name: true, division: true } },
      awayTeam: { select: { name: true, division: true } },
    },
  })

  if (!match) return null

  return withPrediction(match)
}

/**
 * A member's predictions across the season, newest fixture first.
 *
 * Only scored fixtures carry points; unscored ones are still listed so the
 * history shows what is pending rather than dropping it.
 */
export async function getPredictionHistory({
  userId,
  seasonId,
}: {
  userId: string
  seasonId: string
}) {
  return await db.prediction.findMany({
    where: { userId, seasonId },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      submittedAt: true,
      score: { select: { points: true, ruleApplied: true } },
      match: {
        select: {
          id: true,
          playedAt: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      },
    },
    orderBy: { match: { playedAt: 'desc' } },
  })
}
