import { cache } from 'react'
import { db } from '@/lib/db'
import { requireOnboardedUser } from '@/lib/auth/session'
import { canManageMatch, type Actor } from '@/lib/auth/permissions'

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
  const user = await requireOnboardedUser()

  return { id: user.id, isSuperadmin: user.isSuperadmin }
})

/**
 * Asserts the caller may manage this fixture — results, `locksAt`, edits.
 *
 * Returns the actor so callers can record who acted in the AuditLog without a
 * second lookup.
 */
export async function requireMatchManager(matchId: string): Promise<Actor> {
  const actor = await getActor()

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  })

  if (!match) throw new NotFoundError('Cette rencontre n’existe pas.')

  if (!canManageMatch(actor)) {
    throw new ForbiddenError(
      'Seul un administrateur peut modifier cette rencontre.',
    )
  }

  return actor
}

/** Asserts the caller is a superadmin. */
export async function requireSuperadmin(): Promise<Actor> {
  const actor = await getActor()

  if (!actor.isSuperadmin) {
    throw new ForbiddenError('Action réservée aux administrateurs.')
  }

  return actor
}
