'use server'

import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const signupSchema = z.object({
  // Trim and lowercase *before* validating: members paste addresses with a
  // trailing space, and zod's email check runs on the raw value, so validating
  // first would reject an address that normalises perfectly well.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Adresse e-mail invalide.' })),
})

export type SignupState =
  | { status: 'idle' }
  | { status: 'sent'; email: string }
  | { status: 'error'; message: string }

/**
 * Step 1 of account creation: prove the address is real before anything else.
 *
 * No password is collected here — Supabase creates the auth user with none,
 * sends a one-time link, and `/auth/callback` sends a first-time verifier on
 * to `/onboarding` to choose a password and pseudo. This mirrors the shape a
 * password would have anyway (you cannot use it until the address is proven),
 * without ever holding a credential for an unverified mailbox.
 */
export async function requestSignup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Adresse e-mail invalide.',
    }
  }

  const { email } = parsed.data
  const supabase = await createClient()

  const callback = new URL('/auth/callback', siteUrl())

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
    // Supabase rate-limits these per address. Surfacing that plainly beats a
    // generic failure, since the member's fix is simply to wait.
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
