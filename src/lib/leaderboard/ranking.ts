/**
 * Turning point totals into a ranked table.
 *
 * Pure functions, no database — the ordering and tie rules are the part worth
 * testing, and they are far easier to test without one.
 */

export type LeaderboardEntry = {
  userId: string
  name: string
  points: number
  /** Predictions that have been scored — the denominator behind the points. */
  scoredCount: number
  exactCount: number
}

export type RankedEntry = LeaderboardEntry & { rank: number }

/**
 * Ranks members by points, then by exact scores, then by name.
 *
 * Standard competition ranking: two members on equal points share a rank and
 * the next one skips (1, 2, 2, 4). Ranking them 1, 2, 3 arbitrarily would show
 * one of them above the other for no reason they could see.
 *
 * Exact scores break ties before the alphabet does: it rewards the sharper
 * predictor rather than a lucky surname. Names are the last resort only so the
 * order is stable between renders.
 */
export function rankLeaderboard(entries: LeaderboardEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount

    return a.name.localeCompare(b.name, 'fr')
  })

  const ranked: RankedEntry[] = []

  sorted.forEach((entry, index) => {
    const previous = ranked[index - 1]

    // Ties are decided on points alone. The exact-score tiebreak orders the
    // rows, but showing two different ranks for the same point total would
    // read as a scoring bug to anyone comparing the two.
    const tiedWithPrevious = previous !== undefined && previous.points === entry.points

    ranked.push({
      ...entry,
      rank: tiedWithPrevious ? previous.rank : index + 1,
    })
  })

  return ranked
}
