import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  DEFAULT_MAX_SCORE,
  MAX_MAX_SCORE,
  MIN_MAX_SCORE,
  isPossibleScore,
  maxScoreField,
  optionalMaxScoreField,
  possibleScores,
  resolveMaxScore,
  scoreFieldFor,
  withPossibleScore,
} from './score-field'

/**
 * The rubber count is a per-fixture setting, so what is worth testing is that
 * the rules actually track the value they are handed — a schema that silently
 * kept a build-time constant would pass every test written against one fixed
 * count.
 */

describe('scoreFieldFor', () => {
  it('accepts a score at the count and rejects the one above it', () => {
    const field = scoreFieldFor(6)

    expect(field.safeParse(6).success).toBe(true)
    expect(field.safeParse(7).success).toBe(false)
  })

  it('tracks the count it is given rather than a fixed one', () => {
    expect(scoreFieldFor(12).safeParse(12).success).toBe(true)
    expect(scoreFieldFor(6).safeParse(12).success).toBe(false)
  })

  it('rejects negatives and non-integers', () => {
    const field = scoreFieldFor(8)

    expect(field.safeParse(-1).success).toBe(false)
    expect(field.safeParse(3.5).success).toBe(false)
  })

  it('coerces the strings a form posts', () => {
    expect(scoreFieldFor(8).parse('5')).toBe(5)
  })
})

describe('isPossibleScore', () => {
  it('accepts every split of the rubbers', () => {
    // A 6-rubber fixture: 6-0 through 0-6, all of them real results.
    expect(isPossibleScore(6, 0, 6)).toBe(true)
    expect(isPossibleScore(4, 2, 6)).toBe(true)
    expect(isPossibleScore(3, 3, 6)).toBe(true)
    expect(isPossibleScore(0, 6, 6)).toBe(true)
  })

  it('rejects a scoreline that does not use up every rubber', () => {
    // Both sides are within range, and the fixture still cannot end 2-2:
    // two rubbers would have gone unplayed.
    expect(isPossibleScore(2, 2, 6)).toBe(false)
    expect(isPossibleScore(5, 2, 6)).toBe(false)
    expect(isPossibleScore(0, 0, 6)).toBe(false)
  })

  it('allows a draw only when the count is even', () => {
    expect(isPossibleScore(3, 3, 6)).toBe(true)
    expect(isPossibleScore(3, 3, 7)).toBe(false)
  })
})

describe('possibleScores', () => {
  it('lists one scoreline per rubber split, home side descending', () => {
    expect(possibleScores(3)).toEqual([
      { homeScore: 0, awayScore: 3 },
      { homeScore: 1, awayScore: 2 },
      { homeScore: 2, awayScore: 1 },
      { homeScore: 3, awayScore: 0 },
    ])
  })

  it('produces count + 1 outcomes, and every one of them is possible', () => {
    const scores = possibleScores(8)

    expect(scores).toHaveLength(9)
    expect(
      scores.every((s) => isPossibleScore(s.homeScore, s.awayScore, 8)),
    ).toBe(true)
  })
})

describe('withPossibleScore', () => {
  const schemaFor = (maxScore: number) =>
    withPossibleScore(
      z.object({
        homeScore: scoreFieldFor(maxScore),
        awayScore: scoreFieldFor(maxScore),
      }),
      maxScore,
    )

  it('accepts a scoreline that uses every rubber', () => {
    expect(schemaFor(6).safeParse({ homeScore: 4, awayScore: 2 }).success).toBe(
      true,
    )
  })

  it('rejects one that leaves rubbers unaccounted for', () => {
    expect(schemaFor(6).safeParse({ homeScore: 2, awayScore: 2 }).success).toBe(
      false,
    )
  })

  it('names the total in the message', () => {
    const result = schemaFor(6).safeParse({ homeScore: 2, awayScore: 2 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('6')
    }
  })

  it('still coerces posted strings', () => {
    expect(schemaFor(6).parse({ homeScore: '4', awayScore: '2' })).toEqual({
      homeScore: 4,
      awayScore: 2,
    })
  })
})

describe('resolveMaxScore', () => {
  it('prefers the fixture override', () => {
    expect(resolveMaxScore(6, 8)).toBe(6)
  })

  it('falls back to the competition default when unset', () => {
    expect(resolveMaxScore(null, 8)).toBe(8)
    expect(resolveMaxScore(undefined, 8)).toBe(8)
  })

  it('does not treat a zero override as absent', () => {
    // Not a legal setting, but `??` must not silently swap it for the default:
    // that would hide a bad value rather than surface it.
    expect(resolveMaxScore(0, 8)).toBe(0)
  })
})

describe('maxScoreField', () => {
  it('accepts the default', () => {
    expect(maxScoreField.safeParse(DEFAULT_MAX_SCORE).success).toBe(true)
  })

  it('rejects 0 — a fixture of no matches has no valid score', () => {
    expect(maxScoreField.safeParse(0).success).toBe(false)
  })

  it('accepts its own bounds and rejects just outside them', () => {
    expect(maxScoreField.safeParse(MIN_MAX_SCORE).success).toBe(true)
    expect(maxScoreField.safeParse(MAX_MAX_SCORE).success).toBe(true)
    expect(maxScoreField.safeParse(MAX_MAX_SCORE + 1).success).toBe(false)
  })

  it('rejects a non-integer count', () => {
    expect(maxScoreField.safeParse(8.5).success).toBe(false)
  })
})

describe('optionalMaxScoreField', () => {
  it('reads an empty input as "inherit the default", not as zero', () => {
    expect(optionalMaxScoreField.parse('')).toBeNull()
  })

  it('still parses a real override', () => {
    expect(optionalMaxScoreField.parse('6')).toBe(6)
  })

  it('rejects an out-of-range override', () => {
    expect(optionalMaxScoreField.safeParse('0').success).toBe(false)
    expect(
      optionalMaxScoreField.safeParse(`${MAX_MAX_SCORE + 1}`).success,
    ).toBe(false)
  })
})
