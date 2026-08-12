import { cache } from 'react'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import {
  canManageAdmins,
  canManageMatch,
  isAdminOfClub,
  type Actor,
  type MatchClubs,
} from '@/lib/auth/permissions'

/**
 * Server-side enforcement of the permission rules.
 *
 * The rules themselves live in `permissions.ts` as pure functions; this module
 * loads the actor from the database and turns a denied rule into an error.
 * Route handlers and server actions call these — hiding a button in the UI is
 * not access control, the server is the boundary.
 */

/** Thrown when the caller is authenticated but not allowed to do this. */
export class ForbiddenError extends Error {
  constructor(message = 'Vous n’avez pas les droits pour cette action.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** Thrown when the target of an action does not exist. */
export class NotFoundError extends Error {
  constructor(message = 'Ressource introuvable.') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Loads the current caller's identity and rights.
 *
 * `cache()` scopes this to one render pass, so a page checking several
 * permissions costs a single query rather than one per check.
 */
export const getActor = cache(async (): Promise<Actor> => {
  const user = await requireUser()

  const adminOf = await db.clubAdmin.findMany({
    where: { userId: user.id },
    select: { clubId: true },
  })

  return {
    id: user.id,
    isSuperadmin: user.isSuperadmin,
    clubId: user.clubId,
    adminClubIds: adminOf.map((row) => row.clubId),
  }
})

/** The clubs a fixture belongs to, or null when it does not exist. */
export async function getMatchClubs(matchId: string): Promise<MatchClubs | null> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: {
      homeTeam: { select: { clubId: true } },
      awayTeam: { select: { clubId: true } },
    },
  })

  if (!match) return null

  return {
    homeClubId: match.homeTeam.clubId,
    awayClubId: match.awayTeam.clubId,
  }
}

/**
 * Asserts the caller may manage this fixture — results, `locksAt`, edits.
 *
 * Returns the actor so callers can record who acted in the AuditLog without a
 * second lookup.
 */
export async function requireMatchManager(matchId: string): Promise<Actor> {
  const actor = await getActor()
  const clubs = await getMatchClubs(matchId)

  if (!clubs) throw new NotFoundError('Cette rencontre n’existe pas.')

  if (!canManageMatch(actor, clubs)) {
    throw new ForbiddenError(
      'Seul un administrateur de l’un des deux clubs peut modifier cette rencontre.',
    )
  }

  return actor
}

/** Asserts the caller administers `clubId` (or is superadmin). */
export async function requireClubAdmin(clubId: string): Promise<Actor> {
  const actor = await getActor()

  if (!isAdminOfClub(actor, clubId)) {
    throw new ForbiddenError(
      'Seul un administrateur de ce club peut effectuer cette action.',
    )
  }

  return actor
}

/** Asserts the caller is a superadmin — granting admin rights, mainly. */
export async function requireSuperadmin(): Promise<Actor> {
  const actor = await getActor()

  if (!canManageAdmins(actor)) {
    throw new ForbiddenError('Action réservée aux administrateurs généraux.')
  }

  return actor
}
