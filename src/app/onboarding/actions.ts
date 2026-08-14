'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Indiquez un pseudo (2 caractères minimum).' })
    .max(60, { message: 'Ce pseudo est trop long (60 caractères maximum).' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
})

export type OnboardingState =
  | { status: 'idle' }
  | { status: 'error'; message: string }

/**
 * Completes account creation: sets the password Supabase never got at
 * sign-up time, and the pseudo the rest of the app displays.
 *
 * Requires an active session — the member only has one because they already
 * clicked a verification link, which is the identity proof this relies on.
 */
export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser()

  const parsed = onboardingSchema.safeParse({
    name: formData.get('name'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Formulaire invalide.',
    }
  }

  const { name, password } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return {
      status: 'error',
      message: "Impossible d'enregistrer le mot de passe. Réessayez.",
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, onboardedAt: new Date() },
  })

  redirect('/home')
}
