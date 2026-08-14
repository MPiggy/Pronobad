import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'

/**
 * Reads for the member-facing prediction screens.
 *
 * Kept out of the pages so the shape of "a fixture with my prediction on it"
 * is defined once. Each fixture carries at most one prediction — the caller's —
 * because `Prediction` is unique on (userId, matchId) and every query below
 * filters by user. Other members' predictions are deliberately never selected:
 * they would leak before lock, and the leaderboard is the place they surface.
 *
 * `userId` is always a plain argument (never read from `cookies()` in here),
 * so it becomes part of the cache key below — each member gets their own
 * cache entry, never someone else's.
 */

/** Tag for every fixture list of a season — busted when any match in it changes. */
export const matchesTag = (seasonId: string) => `matches-${seasonId}`
/** Tag for a single fixture — busted on its own result/lock/prediction changes. */
export const matchTag = (matchId: string) => `match-${matchId}`

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
  'use cache'
  cacheLife('minutes')
  cacheTag(matchesTag(seasonId))

  const matches = await db.match.findMany({
    where: { seasonId },
    select: matchWithPredictionSelect(userId),
    orderBy: { playedAt: 'asc' },
  })

  return matches.map(withPrediction)
}

/**
 * The next fixture that hasn't been played yet, with the caller's prediction.
 *
 * "Next" is by kickoff time, not lock time — once locked-but-not-played it's
 * still the one a member cares about seeing on the home screen. Once a result
 * lands the match stops being "next" even if a later one hasn't been created yet.
 */
export async function getNextMatchForUser({
  seasonId,
  userId,
  now,
}: {
  seasonId: string
  userId: string
  now: Date
}) {
  'use cache'
  cacheLife('minutes')
  cacheTag(matchesTag(seasonId))

  const match = await db.match.findFirst({
    where: { seasonId, playedAt: { gte: now }, resultEnteredAt: null },
    select: matchWithPredictionSelect(userId),
    orderBy: { playedAt: 'asc' },
  })

  if (!match) return null

  return withPrediction(match)
}

/** One fixture, with the caller's prediction. */
export async function getMatchForUser({
  matchId,
  userId,
}: {
  matchId: string
  userId: string
}) {
  'use cache'
  cacheLife('minutes')
  cacheTag(matchTag(matchId))

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
  'use cache'
  cacheLife('minutes')
  cacheTag(matchesTag(seasonId))

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
