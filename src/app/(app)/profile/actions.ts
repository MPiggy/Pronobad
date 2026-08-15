'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DEMO_COOKIE, isDemoMode } from '@/lib/auth/demo'
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
