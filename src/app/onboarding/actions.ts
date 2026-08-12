'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Indiquez votre nom (2 caractères minimum).' })
    .max(60, { message: 'Ce nom est trop long (60 caractères maximum).' }),
  clubId: z.string().min(1, { message: 'Choisissez votre club.' }),
})

export type OnboardingState = { status: 'idle' } | { status: 'error'; message: string }

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser()

  const parsed = onboardingSchema.safeParse({
    name: formData.get('name'),
    clubId: formData.get('clubId'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Formulaire invalide.',
    }
  }

  const { name, clubId } = parsed.data

  // The club id arrives from a form the member controls, so it is checked
  // rather than trusted — a bad id would otherwise fail as a foreign-key error.
  const club = await db.club.findUnique({ where: { id: clubId }, select: { id: true } })

  if (!club) {
    return { status: 'error', message: 'Ce club n’existe pas.' }
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, clubId: club.id },
  })

  redirect('/fixtures')
}
