import { describe, expect, it } from 'vitest'
import {
  canEditLocksAt,
  canEnterResult,
  canImportFixtures,
  canManageAdmins,
  canManageMatch,
  canPredict,
  isAdminOfClub,
  isAnyClubAdmin,
  type Actor,
  type MatchClubs,
} from './permissions'

const CLUB_A = 'club-a'
const CLUB_B = 'club-b'
const CLUB_C = 'club-c'

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'user-1',
    isSuperadmin: false,
    clubId: CLUB_A,
    adminClubIds: [],
    ...overrides,
  }
}

/** A fixture between club A (home) and club B (away). */
const MATCH: MatchClubs = { homeClubId: CLUB_A, awayClubId: CLUB_B }

const member = actor()
const homeAdmin = actor({ id: 'admin-a', adminClubIds: [CLUB_A] })
const awayAdmin = actor({ id: 'admin-b', clubId: CLUB_B, adminClubIds: [CLUB_B] })
const otherAdmin = actor({ id: 'admin-c', clubId: CLUB_C, adminClubIds: [CLUB_C] })
const superadmin = actor({ id: 'super', isSuperadmin: true })

describe('isAdminOfClub', () => {
  it('is true for the club the user administers', () => {
    expect(isAdminOfClub(homeAdmin, CLUB_A)).toBe(true)
  })

  it('is false for other clubs', () => {
    expect(isAdminOfClub(homeAdmin, CLUB_B)).toBe(false)
  })

  // The case the join table exists to handle: membership does not grant rights.
  it('is false for a plain member of that very club', () => {
    expect(isAdminOfClub(member, CLUB_A)).toBe(false)
  })

  it('is true everywhere for a superadmin', () => {
    expect(isAdminOfClub(superadmin, CLUB_A)).toBe(true)
    expect(isAdminOfClub(superadmin, CLUB_C)).toBe(true)
  })

  // Someone who changed club must not keep rights over the new one implicitly.
  it('follows ClubAdmin, not the membership club', () => {
    const moved = actor({ clubId: CLUB_B, adminClubIds: [CLUB_A] })

    expect(isAdminOfClub(moved, CLUB_A)).toBe(true)
    expect(isAdminOfClub(moved, CLUB_B)).toBe(false)
  })

  it('supports administering several clubs', () => {
    const dual = actor({ adminClubIds: [CLUB_A, CLUB_B] })

    expect(isAdminOfClub(dual, CLUB_A)).toBe(true)
    expect(isAdminOfClub(dual, CLUB_B)).toBe(true)
    expect(isAdminOfClub(dual, CLUB_C)).toBe(false)
  })
})

describe('isAnyClubAdmin', () => {
  it('separates admins from members', () => {
    expect(isAnyClubAdmin(member)).toBe(false)
    expect(isAnyClubAdmin(homeAdmin)).toBe(true)
    expect(isAnyClubAdmin(superadmin)).toBe(true)
  })
})

describe('canManageMatch', () => {
  it('allows the admin of either club', () => {
    expect(canManageMatch(homeAdmin, MATCH)).toBe(true)
    expect(canManageMatch(awayAdmin, MATCH)).toBe(true)
  })

  it('allows superadmins', () => {
    expect(canManageMatch(superadmin, MATCH)).toBe(true)
  })

  // The check that protects the leaderboard.
  it('refuses ordinary members', () => {
    expect(canManageMatch(member, MATCH)).toBe(false)
  })

  it('refuses an admin of an uninvolved club', () => {
    expect(canManageMatch(otherAdmin, MATCH)).toBe(false)
  })
})

describe('canEnterResult / canEditLocksAt', () => {
  it('match the fixture-management rule', () => {
    for (const subject of [member, homeAdmin, awayAdmin, otherAdmin, superadmin]) {
      const expected = canManageMatch(subject, MATCH)

      expect(canEnterResult(subject, MATCH)).toBe(expected)
      expect(canEditLocksAt(subject, MATCH)).toBe(expected)
    }
  })
})

describe('canImportFixtures', () => {
  it('is scoped to the club being imported into', () => {
    expect(canImportFixtures(homeAdmin, CLUB_A)).toBe(true)
    expect(canImportFixtures(homeAdmin, CLUB_B)).toBe(false)
    expect(canImportFixtures(superadmin, CLUB_C)).toBe(true)
    expect(canImportFixtures(member, CLUB_A)).toBe(false)
  })
})

describe('canManageAdmins', () => {
  it('is superadmin-only', () => {
    expect(canManageAdmins(superadmin)).toBe(true)
    expect(canManageAdmins(homeAdmin)).toBe(false)
    expect(canManageAdmins(member)).toBe(false)
  })
})

describe('canPredict', () => {
  it('requires a club', () => {
    expect(canPredict(member)).toBe(true)
    expect(canPredict(actor({ clubId: null }))).toBe(false)
  })

  // Deliberate product decision, not an oversight — see PLAN.md.
  it('allows admins to predict on fixtures they manage', () => {
    expect(canPredict(homeAdmin)).toBe(true)
    expect(canManageMatch(homeAdmin, MATCH)).toBe(true)
  })

  it('refuses a superadmin who has not joined a club', () => {
    expect(canPredict(actor({ isSuperadmin: true, clubId: null }))).toBe(false)
  })
})
