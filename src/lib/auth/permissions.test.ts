import { describe, expect, it } from 'vitest'
import { canEditLocksAt, canEnterResult, canManageMatch, type Actor } from './permissions'

function actor(overrides: Partial<Actor> = {}): Actor {
  return { id: 'user-1', isSuperadmin: false, ...overrides }
}

const member = actor()
const superadmin = actor({ id: 'super', isSuperadmin: true })

describe('canManageMatch', () => {
  it('allows superadmins', () => {
    expect(canManageMatch(superadmin)).toBe(true)
  })

  // The check that protects the leaderboard.
  it('refuses ordinary members', () => {
    expect(canManageMatch(member)).toBe(false)
  })
})

describe('canEnterResult / canEditLocksAt', () => {
  it('match the fixture-management rule', () => {
    for (const subject of [member, superadmin]) {
      const expected = canManageMatch(subject)

      expect(canEnterResult(subject)).toBe(expected)
      expect(canEditLocksAt(subject)).toBe(expected)
    }
  })
})
