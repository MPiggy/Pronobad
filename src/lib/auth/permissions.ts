/**
 * Who may do what.
 *
 * The rules are pure functions over an already-loaded {@link Actor}, kept
 * separate from the database lookups in `guards.ts`. Permission logic is the
 * part that must be exhaustively tested, and it is far easier to test when
 * answering "may this user do X" needs no database.
 *
 * There is a single club, so rights are just superadmin vs. everyone else.
 */

/** The caller's identity and rights, loaded once per request. */
export type Actor = {
  id: string
  isSuperadmin: boolean
}

/**
 * Whether the actor may manage a fixture — entering results, editing
 * `locksAt`, or editing the fixture itself. Superadmin only.
 */
export function canManageMatch(actor: Actor): boolean {
  return actor.isSuperadmin
}

/**
 * Whether the actor may enter or correct a fixture's official result.
 *
 * Same rule as managing the fixture, named separately because it is the check
 * that actually protects the leaderboard: without it any signed-in member could
 * POST a result and rewrite everyone's points.
 */
export function canEnterResult(actor: Actor): boolean {
  return canManageMatch(actor)
}

/**
 * Whether the actor may move a fixture's `locksAt`.
 *
 * Deliberately the same rule as result entry, but a distinct function: moving
 * `locksAt` reopens a closed prediction window, so it is audited separately.
 */
export function canEditLocksAt(actor: Actor): boolean {
  return canManageMatch(actor)
}
