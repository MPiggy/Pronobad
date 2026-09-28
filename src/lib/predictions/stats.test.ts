import { describe, expect, it } from 'vitest'
import { ScoringRule } from '@/lib/scoring/rules'
import { percentages, summarizePredictions, type BetForStats } from './stats'

const bet = (
  homeScore: number,
  awayScore: number,
  score: BetForStats['score'] = null,
): BetForStats => ({ homeScore, awayScore, score })

describe('summarizePredictions', () => {
  it('returns empty stats for a fixture nobody predicted', () => {
    expect(summarizePredictions([])).toEqual({
      total: 0,
      outcomes: { home: 0, draw: 0, away: 0 },
      average: null,
      topScores: [],
      rules: { exact: 0, outcome: 0, wrong: 0 },
      pointsAwarded: 0,
    })
  })

  it('splits predictions by outcome and averages each side', () => {
    const stats = summarizePredictions([bet(5, 3), bet(6, 2), bet(4, 4), bet(1, 7)])

    expect(stats.total).toBe(4)
    expect(stats.outcomes).toEqual({ home: 2, draw: 1, away: 1 })
    expect(stats.average).toEqual({ homeScore: 4, awayScore: 4 })
  })

  it('ranks the most-predicted scores, breaking ties home-heavy first', () => {
    const stats = summarizePredictions(
      [bet(4, 4), bet(5, 3), bet(5, 3), bet(3, 5), bet(4, 4), bet(6, 2)],
      { topScoreLimit: 3 },
    )

    expect(stats.topScores).toEqual([
      { homeScore: 5, awayScore: 3, count: 2 },
      { homeScore: 4, awayScore: 4, count: 2 },
      { homeScore: 6, awayScore: 2, count: 1 },
    ])
  })

  it('counts how scored predictions fared and the points handed out', () => {
    const stats = summarizePredictions([
      bet(5, 3, { points: 3, ruleApplied: ScoringRule.ExactScore }),
      bet(6, 2, { points: 1, ruleApplied: ScoringRule.CorrectOutcome }),
      bet(7, 1, { points: 1, ruleApplied: ScoringRule.CorrectOutcome }),
      bet(2, 6, { points: 0, ruleApplied: ScoringRule.Wrong }),
    ])

    expect(stats.rules).toEqual({ exact: 1, outcome: 2, wrong: 1 })
    expect(stats.pointsAwarded).toBe(5)
  })
})

describe('percentages', () => {
  it('always adds up to 100', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33])
    expect(percentages([2, 1, 0])).toEqual([67, 33, 0])
  })

  it('is all zero when there is nothing to share', () => {
    expect(percentages([0, 0, 0])).toEqual([0, 0, 0])
  })
})
