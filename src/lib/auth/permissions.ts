/**
 * Who may do what.
 *
 * The rules are pure functions over an already-loaded {@link Actor}, kept
 * separate from the database lookups in `guards.ts`. Permission logic is the
 * part that must be exhaustively tested, and it is far easier to test when
 * answering "may this user do X" needs no database.
 *
 * See PLAN.md § Roles & Permissions for the reasoning behind the model:
 * membership (`User.clubId`) and permission (`ClubAdmin`) are deliberately
 * separate, so a member changing club never silently keeps admin rights.
 */

/** The caller's identity and rights, loaded once per request. */
export type Actor = {
  id: string
  isSuperadmin: boolean
  /** Club the actor predicts for. Null until onboarding completes. */
  clubId: string | null
  /** Clubs the actor administers. Empty for ordinary members. */
  adminClubIds: readonly string[]
}

/** The two clubs a fixture concerns. Either side's admin may manage it. */
export type MatchClubs = {
  homeClubId: string
  awayClubId: string
}

/** Whether the actor administers this specific club. */
export function isAdminOfClub(actor: Actor, clubId: string): boolean {
  if (actor.isSuperadmin) return true

  return actor.adminClubIds.includes(clubId)
}

/** Whether the actor administers at least one club. Used to show admin nav. */
export function isAnyClubAdmin(actor: Actor): boolean {
  return actor.isSuperadmin || actor.adminClubIds.length > 0
}

/**
 * Whether the actor may manage a fixture — entering results, editing
 * `locksAt`, or editing the fixture itself.
 *
 * Both clubs qualify, not just the home one: an away club's admin has an equal
 * stake in the result being right, and requiring the home admin to enter every
 * result would stall the leaderboard whenever they are unavailable.
 */
export function canManageMatch(actor: Actor, match: MatchClubs): boolean {
  return (
    isAdminOfClub(actor, match.homeClubId) ||
    isAdminOfClub(actor, match.awayClubId)
  )
}

/**
 * Whether the actor may enter or correct a fixture's official result.
 *
 * Same rule as managing the fixture, named separately because it is the check
 * that actually protects the leaderboard: without it any signed-in member could
 * POST a result and rewrite everyone's points.
 */
export function canEnterResult(actor: Actor, match: MatchClubs): boolean {
  return canManageMatch(actor, match)
}

/**
 * Whether the actor may move a fixture's `locksAt`.
 *
 * Deliberately the same rule as result entry, but a distinct function: moving
 * `locksAt` reopens a closed prediction window, so it is audited separately and
 * may yet diverge. Callers must write an AuditLog entry — see PLAN.md.
 */
export function canEditLocksAt(actor: Actor, match: MatchClubs): boolean {
  return canManageMatch(actor, match)
}

/**
 * Whether the actor may create fixtures or run a CSV import for a club.
 *
 * Scoped to a club rather than global: a club admin importing their own
 * season's fixtures is routine, but must not be able to write fixtures for a
 * club they have nothing to do with.
 */
export function canImportFixtures(actor: Actor, clubId: string): boolean {
  return isAdminOfClub(actor, clubId)
}

/**
 * Whether the actor may grant or revoke club-admin rights.
 *
 * Superadmin only. Letting club admins promote other admins would make the
 * permission set grow on its own, with no way to trace who granted what.
 */
export function canManageAdmins(actor: Actor): boolean {
  return actor.isSuperadmin
}

/**
 * Whether the actor may submit predictions at all.
 *
 * Only checks standing, not timing — `locksAt` is enforced separately by the
 * prediction logic, because "you are allowed to predict" and "this fixture is
 * still open" are different failures and deserve different messages.
 *
 * Club admins may predict on their own fixtures; see PLAN.md for why that is a
 * deliberate choice rather than an oversight.
 */
export function canPredict(actor: Actor): boolean {
  return actor.clubId !== null
}
