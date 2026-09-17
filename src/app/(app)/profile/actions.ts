'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { DEMO_COOKIE, isDemoMode } from '@/lib/auth/demo'
import { requireOnboardedUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { leaderboardTag } from '@/lib/leaderboard/queries'
import { nameField } from '@/lib/users/name-field'
import { createClient } from '@/lib/supabase/server'

/**
 * Signs the member out.
 *
 * A server action rather than a form posting to a route handler: the CSP sets
 * `form-action 'self'`, and Chrome checks that directive against the *redirect
 * target* of a form submission — where `'self'` no longer matches — so a plain
 * `<form method="post">` that answers 303 is silently blocked and the page just
 * sits there. A server action's redirect is a client-side navigation, which
 * `form-action` never applies to.
 *
 * Still a POST under the hood, so the reason the route handler refused GET
 * holds: no `<img>` tag or link prefetch can log a member out.
 */
export type ProfileState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string }

const nameSchema = z.object({ name: nameField })

/**
 * Changes the member's own pseudo.
 *
 * Scoped to the caller by construction: the id comes from the session, never
 * from the form, so this cannot be pointed at another member's row no matter
 * what is posted.
 *
 * The leaderboard is the reason this needs cache work. It is a `use cache`
 * read that selects `user.name` alongside the frozen scores, so without
 * busting its tag a member would rename themselves and still see the old
 * pseudo in the standings for minutes — looking like the change silently
 * failed.
 */
export async function updateName(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireOnboardedUser()

  const parsed = nameSchema.safeParse({ name: formData.get('name') })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Pseudo invalide.',
    }
  }

  const { name } = parsed.data

  if (name === user.name) {
    return { status: 'saved', message: 'Pseudo inchangé.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: { name },
  })

  revalidatePath('/profile')
  revalidatePath('/leaderboard')

  const season = await getCurrentSeason()
  if (season) updateTag(leaderboardTag(season.id))

  return { status: 'saved', message: `Pseudo mis à jour : ${name}.` }
}

export async function signOut(): Promise<never> {
  if (isDemoMode()) {
    const store = await cookies()
    store.delete(DEMO_COOKIE)

    redirect('/login')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  redirect('/login')
}
