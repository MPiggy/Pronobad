import { describe, expect, it } from 'vitest'
import { rankLeaderboard, type LeaderboardEntry } from './ranking'

function entry(overrides: Partial<LeaderboardEntry> & { name: string }): LeaderboardEntry {
  return {
    userId: overrides.name.toLowerCase(),
    points: 0,
    scoredCount: 0,
    exactCount: 0,
    ...overrides,
  }
}

describe('rankLeaderboard', () => {
  it('orders by points, highest first', () => {
    const ranked = rankLeaderboard([
      entry({ name: 'Ana', points: 4 }),
      entry({ name: 'Bo', points: 9 }),
      entry({ name: 'Cy', points: 6 }),
    ])

    expect(ranked.map((row) => row.name)).toEqual(['Bo', 'Cy', 'Ana'])
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3])
  })

  it('breaks ties on exact scores before the alphabet', () => {
    const ranked = rankLeaderboard([
      entry({ name: 'Ana', points: 6, exactCount: 0 }),
      entry({ name: 'Bo', points: 6, exactCount: 2 }),
    ])

    expect(ranked.map((row) => row.name)).toEqual(['Bo', 'Ana'])
  })

  // Standard competition ranking: equal points share a rank even when the
  // exact-score tiebreak decided which row is printed first.
  it('gives tied members the same rank', () => {
    const ranked = rankLeaderboard([
      entry({ name: 'Ana', points: 6, exactCount: 1 }),
      entry({ name: 'Bo', points: 6, exactCount: 2 }),
    ])

    expect(ranked.map((row) => row.rank)).toEqual([1, 1])
  })

  it('skips the rank after a tie', () => {
    const ranked = rankLeaderboard([
      entry({ name: 'Ana', points: 9 }),
      entry({ name: 'Bo', points: 6 }),
      entry({ name: 'Cy', points: 6 }),
      entry({ name: 'Dee', points: 2 }),
    ])

    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 2, 4])
  })

  it('falls back to the name so the order is stable', () => {
    const ranked = rankLeaderboard([
      entry({ name: 'Zoé', points: 5, exactCount: 1 }),
      entry({ name: 'Ana', points: 5, exactCount: 1 }),
    ])

    expect(ranked.map((row) => row.name)).toEqual(['Ana', 'Zoé'])
    expect(ranked.map((row) => row.rank)).toEqual([1, 1])
  })

  it('does not mutate the input', () => {
    const entries = [entry({ name: 'Ana', points: 1 }), entry({ name: 'Bo', points: 9 })]

    rankLeaderboard(entries)

    expect(entries.map((row) => row.name)).toEqual(['Ana', 'Bo'])
  })

  it('handles an empty season', () => {
    expect(rankLeaderboard([])).toEqual([])
  })
})
