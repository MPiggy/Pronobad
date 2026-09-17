import { describe, expect, it } from 'vitest'
import { pickLastResult, unpredictedClosingSoon } from './home'

const NOW = new Date('2026-03-14T12:00:00Z')
const HOUR = 60 * 60 * 1000

function match(overrides: {
  id: string
  playedAt: string
  locksAt?: string
  resultEnteredAt?: string
  predicted?: boolean
}) {
  return {
    id: overrides.id,
    playedAt: new Date(overrides.playedAt),
    locksAt: new Date(overrides.locksAt ?? overrides.playedAt),
    resultEnteredAt: overrides.resultEnteredAt ? new Date(overrides.resultEnteredAt) : null,
    prediction: overrides.predicted ? { homeScore: 4, awayScore: 4 } : null,
  }
}

describe('pickLastResult', () => {
  it('returns the most recently played fixture with a result', () => {
    const matches = [
      match({ id: 'older', playedAt: '2026-02-28T18:00:00Z', resultEnteredAt: '2026-02-28T22:00:00Z' }),
      match({ id: 'latest', playedAt: '2026-03-07T18:00:00Z', resultEnteredAt: '2026-03-08T09:00:00Z' }),
      match({ id: 'unscored', playedAt: '2026-03-10T18:00:00Z' }),
    ]

    expect(pickLastResult(matches)?.id).toBe('latest')
  })

  it('returns null before any result is entered', () => {
    expect(pickLastResult([match({ id: 'a', playedAt: '2026-03-10T18:00:00Z' })])).toBeNull()
  })
})

describe('unpredictedClosingSoon', () => {
  it('counts unpredicted open fixtures closing within the window', () => {
    const matches = [
      match({ id: 'soon', playedAt: '2026-03-14T18:00:00Z' }),
      match({ id: 'tomorrow', playedAt: '2026-03-15T18:00:00Z' }),
      match({ id: 'far', playedAt: '2026-03-20T18:00:00Z' }),
    ]

    expect(unpredictedClosingSoon(matches, NOW)).toEqual({ count: 2, msUntilFirst: 6 * HOUR })
  })

  it('ignores fixtures already predicted or already locked', () => {
    const matches = [
      match({ id: 'predicted', playedAt: '2026-03-14T18:00:00Z', predicted: true }),
      match({ id: 'locked', playedAt: '2026-03-14T11:00:00Z' }),
    ]

    expect(unpredictedClosingSoon(matches, NOW)).toBeNull()
  })
})
