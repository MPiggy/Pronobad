'use server'

import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { safeRedirectPath } from '@/lib/auth/redirect'
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
