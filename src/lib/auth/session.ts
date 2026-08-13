import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { DEMO_AUTH_ID, DEMO_COOKIE, DEMO_EMAIL, isDemoMode } from '@/lib/auth/demo'
import type { User } from '@/generated/prisma/client'

/**
 * The authenticated member's row in our own `User` table.
 *
 * Supabase owns identity (`auth.users`); we own everything domain-related —
 * superadmin flag, predictions. `User.authId` is the join between the two,
 * and this module is the only place that crossing happens.
 */

/**
 * Reads the verified Supabase identity for the current request.
 *
 * `getUser()` rather than `getSession()`: the session cookie is attacker-
 * supplied data, and only `getUser()` validates the JWT against the auth
 * server. Trusting the cookie's contents here would let anyone mint a session
 * for any account.
 *
 * `cache()` deduplicates this within a single render pass — a layout and three
 * components asking who the user is costs one round-trip, not four.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  return user
})

/**
 * The current member's `User` row, creating it on first login.
 *
 * Supabase writes to `auth.users` when a magic link is verified, and nothing
 * automatically mirrors that into our schema. Provisioning here — rather than
 * via a database trigger — keeps the whole flow in application code where it
 * can be read and tested, at the cost of one upsert per cold session.
 *
 * Returns `null` when signed out, so callers decide whether that is an error.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (isDemoMode()) return await getDemoUser()

  const authUser = await getAuthUser()
  if (!authUser) return null

  const email = authUser.email
  if (!email) {
    // Every provider we enable (magic link) is email-based, so this means a
    // misconfigured provider rather than an ordinary signed-out state.
    throw new Error(`Supabase user ${authUser.id} has no email address.`)
  }

  const existing = await db.user.findUnique({ where: { authId: authUser.id } })

  if (existing) {
    // A returning member. Refresh the email in case they changed it in
    // Supabase; `name` is deliberately left alone — it is theirs to edit in the
    // app, and rewriting it from the email on every login would undo that.
    if (existing.email === email) return existing

    return await db.user.update({
      where: { id: existing.id },
      data: { email },
    })
  }

  // No row for this Supabase id. There may still be one for this address: the
  // seed script pre-creates the first superadmin before they have ever logged
  // in, since their Supabase id cannot be known in advance. Claim that row
  // rather than inserting a second one — which would fail on the unique email
  // anyway, and would silently drop the superadmin flag if it did not.
  return await db.user.upsert({
    where: { email },
    update: { authId: authUser.id },
    create: {
      authId: authUser.id,
      email,
      // A placeholder until onboarding collects a real name. Not left empty so
      // that leaderboards always have something to render.
      name: email.split('@')[0] ?? 'Membre',
    },
  })
})

/**
 * Demo mode: the cookie is the whole session.
 *
 * The login action already upserted the row with the chosen name; this only
 * has to find it again — the create is a backstop for a wiped database with a
 * stale cookie. Superadmin so every screen in the app can be shown.
 */
async function getDemoUser(): Promise<User | null> {
  const store = await cookies()
  const raw = store.get(DEMO_COOKIE)?.value
  if (!raw) return null

  return await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      authId: DEMO_AUTH_ID,
      email: DEMO_EMAIL,
      name: decodeURIComponent(raw),
      isSuperadmin: true,
    },
  })
}

/**
 * The current member, or a redirect to the login page.
 *
 * For pages and actions where being signed out is not a state worth rendering.
 * The proxy already gates these routes; this is the server-side backstop that
 * makes the guarantee real rather than advisory.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return user
}
