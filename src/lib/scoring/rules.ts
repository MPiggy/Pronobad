/**
 * The scoring rule, as a pure function.
 *
 * Kept free of database access so the rule can be tested exhaustively and read
 * in one sitting. Persisting the result is `engine.ts`'s job.
 *
 * From PLAN.md: correct winner = 1 point, exact score = 3 points, and **the 3
 * replaces the 1 rather than stacking**.
 */

export const POINTS_EXACT_SCORE = 3
export const POINTS_CORRECT_OUTCOME = 1
export const POINTS_WRONG = 0

/**
 * Identifies which rule produced a score.
 *
 * Stored on `PredictionScore.ruleApplied` so a member can be told exactly why
 * they got their points, and so the scale can change later without making past
 * results unexplainable.
 */
export const ScoringRule = {
  ExactScore: 'EXACT_SCORE',
  CorrectOutcome: 'CORRECT_OUTCOME',
  Wrong: 'WRONG',
} as const

export type ScoringRule = (typeof ScoringRule)[keyof typeof ScoringRule]

export type Score = {
  homeScore: number
  awayScore: number
}

export type ScoringOutcome = {
  points: number
  ruleApplied: ScoringRule
}

/**
 * Which side won, or a draw.
 *
 * Badminton interclub fixtures are played over an even number of rubbers, so a
 * draw is an ordinary result rather than an edge case.
 */
function outcomeOf({ homeScore, awayScore }: Score): 'HOME' | 'AWAY' | 'DRAW' {
  if (homeScore > awayScore) return 'HOME'
  if (homeScore < awayScore) return 'AWAY'

  return 'DRAW'
}

/**
 * Points for one prediction against the official result.
 *
 * Predicting the exact score of a draw earns 3, not 1 + 3: the exact-score
 * rule replaces the outcome rule in every case.
 */
export function scorePrediction(
  prediction: Score,
  result: Score,
): ScoringOutcome {
  const isExact =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore

  if (isExact) {
    return {
      points: POINTS_EXACT_SCORE,
      ruleApplied: ScoringRule.ExactScore,
    }
  }

  if (outcomeOf(prediction) === outcomeOf(result)) {
    return {
      points: POINTS_CORRECT_OUTCOME,
      ruleApplied: ScoringRule.CorrectOutcome,
    }
  }

  return { points: POINTS_WRONG, ruleApplied: ScoringRule.Wrong }
}

/** Human-readable explanation of a score, for the UI. */
export function explainRule(rule: ScoringRule): string {
  switch (rule) {
    case ScoringRule.ExactScore:
      return 'Score exact'
    case ScoringRule.CorrectOutcome:
      return 'Bon vainqueur'
    case ScoringRule.Wrong:
      return 'Pronostic manqué'
  }
}
