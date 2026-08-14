'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
})

export type ResetPasswordState =
  | { status: 'idle' }
  | { status: 'error'; message: string }

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  // The recovery link is what grants this session — no session, no reset.
  await requireUser()

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Mot de passe invalide.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return {
      status: 'error',
      message: "Impossible d'enregistrer le mot de passe. Réessayez.",
    }
  }

  redirect('/fixtures')
}
