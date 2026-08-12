import { describe, expect, it } from 'vitest'
import { explainLock, isLocked, lockState } from './locking'

const NOW = new Date('2026-03-14T19:00:00Z')

const at = (iso: string) => new Date(iso)

describe('lockState', () => {
  it('is open before locksAt', () => {
    const state = lockState({ locksAt: at('2026-03-14T20:00:00Z') }, NOW)

    expect(state.locked).toBe(false)
    expect(state).toMatchObject({ msRemaining: 60 * 60 * 1000 })
  })

  it('is locked after locksAt', () => {
    expect(lockState({ locksAt: at('2026-03-14T18:00:00Z') }, NOW)).toEqual({
      locked: true,
      reason: 'LOCKS_AT_PASSED',
    })
  })

  // The boundary decides whether a prediction submitted on the stroke of the
  // deadline counts. Closed, so the rule matches "predictions close at 19:00".
  it('is locked exactly at locksAt', () => {
    expect(lockState({ locksAt: NOW }, NOW)).toEqual({
      locked: true,
      reason: 'LOCKS_AT_PASSED',
    })
  })

  it('is open one millisecond before locksAt', () => {
    expect(lockState({ locksAt: new Date(NOW.getTime() + 1) }, NOW)).toEqual({
      locked: false,
      msRemaining: 1,
    })
  })

  describe('once a result is entered', () => {
    it('locks even when locksAt is still in the future', () => {
      // The case that matters: an admin moves locksAt forward after entering a
      // result. Predictions must not reopen on a known scoreline.
      expect(
        lockState(
          {
            locksAt: at('2026-03-14T23:00:00Z'),
            resultEnteredAt: at('2026-03-14T18:30:00Z'),
          },
          NOW,
        ),
      ).toEqual({ locked: true, reason: 'RESULT_ENTERED' })
    })

    it('takes precedence over the deadline reason', () => {
      expect(
        lockState(
          {
            locksAt: at('2026-03-14T18:00:00Z'),
            resultEnteredAt: at('2026-03-14T18:30:00Z'),
          },
          NOW,
        ),
      ).toEqual({ locked: true, reason: 'RESULT_ENTERED' })
    })
  })

  it('treats a null resultEnteredAt as not yet played', () => {
    const state = lockState(
      { locksAt: at('2026-03-14T20:00:00Z'), resultEnteredAt: null },
      NOW,
    )

    expect(state.locked).toBe(false)
  })
})

describe('isLocked', () => {
  it('agrees with lockState', () => {
    expect(isLocked({ locksAt: at('2026-03-14T20:00:00Z') }, NOW)).toBe(false)
    expect(isLocked({ locksAt: at('2026-03-14T18:00:00Z') }, NOW)).toBe(true)
  })
})

describe('explainLock', () => {
  it('explains both reasons distinctly', () => {
    const passed = explainLock({ locked: true, reason: 'LOCKS_AT_PASSED' })
    const entered = explainLock({ locked: true, reason: 'RESULT_ENTERED' })

    expect(passed).toMatch(/fermés/)
    expect(entered).toMatch(/résultat/i)
    expect(passed).not.toBe(entered)
  })
})
