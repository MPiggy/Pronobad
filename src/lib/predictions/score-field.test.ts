import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_SCORE,
  MAX_MAX_SCORE,
  MIN_MAX_SCORE,
  maxScoreField,
  scoreFieldFor,
} from './score-field'

/**
 * The cap is an admin setting, so the thing worth testing is that the schema
 * actually tracks the value it is handed — a schema that silently kept a
 * build-time constant would pass every test written against one fixed cap.
 */

describe('scoreFieldFor', () => {
  it('accepts a score at the cap and rejects the one above it', () => {
    const field = scoreFieldFor(8)

    expect(field.safeParse(8).success).toBe(true)
    expect(field.safeParse(9).success).toBe(false)
  })

  it('tracks the cap it is given rather than a fixed one', () => {
    // 12 is legal under a 12-rubber format and illegal under the 8-rubber one.
    expect(scoreFieldFor(12).safeParse(12).success).toBe(true)
    expect(scoreFieldFor(8).safeParse(12).success).toBe(false)
  })

  it('names the cap in the message, so the member is told the actual limit', () => {
    const result = scoreFieldFor(8).safeParse(9)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('8')
    }
  })

  it('accepts 0 — a whitewash is a real interclub score', () => {
    expect(scoreFieldFor(8).safeParse(0).success).toBe(true)
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

describe('maxScoreField', () => {
  it('accepts the default', () => {
    expect(maxScoreField.safeParse(DEFAULT_MAX_SCORE).success).toBe(true)
  })

  it('rejects 0 — it would force every fixture to a 0-0', () => {
    expect(maxScoreField.safeParse(0).success).toBe(false)
  })

  it('accepts its own bounds and rejects just outside them', () => {
    expect(maxScoreField.safeParse(MIN_MAX_SCORE).success).toBe(true)
    expect(maxScoreField.safeParse(MAX_MAX_SCORE).success).toBe(true)
    expect(maxScoreField.safeParse(MAX_MAX_SCORE + 1).success).toBe(false)
  })

  it('rejects a non-integer cap', () => {
    expect(maxScoreField.safeParse(8.5).success).toBe(false)
  })
})
