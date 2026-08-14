'use server'

import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Adresse e-mail invalide.' })),
})

export type ForgotPasswordState =
  | { status: 'idle' }
  | { status: 'sent' }
  | { status: 'error'; message: string }

/**
 * Always reports success, even for an address with no account.
 *
 * Returning an error for unknown addresses would let anyone probe which
 * e-mails are registered members — the same reason login errors don't
 * distinguish "no such account" from "wrong password".
 */
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Adresse e-mail invalide.',
    }
  }

  const { email } = parsed.data
  const supabase = await createClient()

  const callback = new URL('/auth/callback', siteUrl())

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callback.toString(),
  })

  if (error && error.status === 429) {
    return {
      status: 'error',
      message: 'Trop de demandes. Réessayez dans quelques minutes.',
    }
  }

  return { status: 'sent' }
}
