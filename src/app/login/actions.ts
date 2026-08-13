'use server'

import type { Route } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { db } from '@/lib/db'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { DEMO_AUTH_ID, DEMO_COOKIE, DEMO_EMAIL } from '@/lib/auth/demo'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  // Trim and lowercase *before* validating: members paste addresses with a
  // trailing space, and zod's email check runs on the raw value, so validating
  // first would reject an address that normalises perfectly well.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Adresse e-mail invalide.' })),
  next: z.string().nullish(),
})

export type LoginState =
  | { status: 'idle' }
  | { status: 'sent'; email: string }
  | { status: 'error'; message: string }

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Adresse e-mail invalide.',
    }
  }

  const { email, next } = parsed.data
  const supabase = await createClient()

  const callback = new URL('/auth/callback', siteUrl())
  callback.searchParams.set('next', safeRedirectPath(next))

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      // The club is small and closed; anyone with an invite link should be able
      // to join without an admin creating the account first.
      shouldCreateUser: true,
    },
  })

  if (error) {
    // Supabase rate-limits magic links per address. Surfacing that plainly
    // beats a generic failure, since the member's fix is simply to wait.
    if (error.status === 429) {
      return {
        status: 'error',
        message: 'Trop de demandes. Réessayez dans quelques minutes.',
      }
    }

    return {
      status: 'error',
      message: "Envoi impossible pour l'instant. Réessayez plus tard.",
    }
  }

  return { status: 'sent', email }
}

const demoLoginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Indiquez votre nom (2 caractères minimum).' })
    .max(60, { message: 'Ce nom est trop long (60 caractères maximum).' }),
  next: z.string().nullish(),
})

/**
 * Demo-mode login: a name instead of an e-mail, a cookie instead of a session.
 *
 * The row is upserted here — not in `getCurrentUser` — so logging in again
 * under a new name renames the demo member, while edits made in the app
 * (onboarding) are not silently reverted on the next request.
 */
export async function demoLogin(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = demoLoginSchema.safeParse({
    name: formData.get('name'),
    next: formData.get('next'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Nom invalide.',
    }
  }

  const { name, next } = parsed.data

  await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name },
    create: {
      authId: DEMO_AUTH_ID,
      email: DEMO_EMAIL,
      name,
      isSuperadmin: true,
    },
  })

  const store = await cookies()
  // Encoded because cookie values cannot carry accented characters raw, and
  // French names will have them.
  store.set(DEMO_COOKIE, encodeURIComponent(name), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })

  // `safeRedirectPath` only ever returns an internal path, which is what the
  // Route type is guarding for — the cast closes the gap typed routes cannot
  // check on a runtime value.
  redirect(safeRedirectPath(next) as Route)
}
