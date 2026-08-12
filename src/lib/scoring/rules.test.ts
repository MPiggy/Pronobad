import { describe, expect, it } from 'vitest'
import {
  POINTS_CORRECT_OUTCOME,
  POINTS_EXACT_SCORE,
  POINTS_WRONG,
  ScoringRule,
  explainRule,
  scorePrediction,
} from './rules'

describe('scorePrediction', () => {
  it('awards 3 for the exact score', () => {
    expect(scorePrediction({ homeScore: 5, awayScore: 3 }, { homeScore: 5, awayScore: 3 })).toEqual(
      { points: POINTS_EXACT_SCORE, ruleApplied: ScoringRule.ExactScore },
    )
  })

  it('awards 1 for the right winner with the wrong score', () => {
    expect(scorePrediction({ homeScore: 5, awayScore: 3 }, { homeScore: 6, awayScore: 2 })).toEqual(
      { points: POINTS_CORRECT_OUTCOME, ruleApplied: ScoringRule.CorrectOutcome },
    )
  })

  it('awards 0 for the wrong winner', () => {
    expect(scorePrediction({ homeScore: 5, awayScore: 3 }, { homeScore: 3, awayScore: 5 })).toEqual(
      { points: POINTS_WRONG, ruleApplied: ScoringRule.Wrong },
    )
  })

  // The rule most likely to be got wrong: 3 replaces 1, it does not stack.
  it('does not stack the exact-score and winner points', () => {
    const { points } = scorePrediction(
      { homeScore: 5, awayScore: 3 },
      { homeScore: 5, awayScore: 3 },
    )

    expect(points).toBe(POINTS_EXACT_SCORE)
    expect(points).not.toBe(POINTS_EXACT_SCORE + POINTS_CORRECT_OUTCOME)
  })

  describe('draws', () => {
    it('awards 3 for an exactly predicted draw', () => {
      expect(
        scorePrediction({ homeScore: 4, awayScore: 4 }, { homeScore: 4, awayScore: 4 }),
      ).toEqual({ points: POINTS_EXACT_SCORE, ruleApplied: ScoringRule.ExactScore })
    })

    it('awards 1 for predicting a draw with the wrong score', () => {
      expect(
        scorePrediction({ homeScore: 3, awayScore: 3 }, { homeScore: 4, awayScore: 4 }),
      ).toEqual({
        points: POINTS_CORRECT_OUTCOME,
        ruleApplied: ScoringRule.CorrectOutcome,
      })
    })

    it('awards 0 when a draw was predicted but someone won', () => {
      expect(
        scorePrediction({ homeScore: 4, awayScore: 4 }, { homeScore: 5, awayScore: 3 }),
      ).toEqual({ points: POINTS_WRONG, ruleApplied: ScoringRule.Wrong })
    })

    it('awards 0 when a win was predicted but it ended level', () => {
      expect(
        scorePrediction({ homeScore: 5, awayScore: 3 }, { homeScore: 4, awayScore: 4 }),
      ).toEqual({ points: POINTS_WRONG, ruleApplied: ScoringRule.Wrong })
    })
  })

  // A reversed scoreline is a wrong prediction, not an exact one.
  it('is not symmetric between home and away', () => {
    const { points } = scorePrediction(
      { homeScore: 3, awayScore: 5 },
      { homeScore: 5, awayScore: 3 },
    )

    expect(points).toBe(POINTS_WRONG)
  })

  it('handles a whitewash', () => {
    expect(scorePrediction({ homeScore: 8, awayScore: 0 }, { homeScore: 8, awayScore: 0 })).toEqual(
      { points: POINTS_EXACT_SCORE, ruleApplied: ScoringRule.ExactScore },
    )
  })
})

describe('explainRule', () => {
  it('describes every rule', () => {
    expect(explainRule(ScoringRule.ExactScore)).toBe('Score exact')
    expect(explainRule(ScoringRule.CorrectOutcome)).toBe('Bon vainqueur')
    expect(explainRule(ScoringRule.Wrong)).toBe('Pronostic manqué')
  })
})
