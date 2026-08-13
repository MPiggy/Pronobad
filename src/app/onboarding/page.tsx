import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = {
  title: 'Bienvenue — Pronobad',
}

export default async function OnboardingPage() {
  const user = await requireUser()

  // Already onboarded — nothing to do here.
  if (user.clubId) redirect('/fixtures')

  const clubs = await db.club.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8">
        <p className="eyebrow mb-3">Bienvenue</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Rejoignez votre club
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Deux informations et vous pourrez pronostiquer.
        </p>
      </header>

      {clubs.length === 0 ? (
        <p className="rounded-lg border border-line bg-sheet px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
          Aucun club n’est encore enregistré. Contactez l’administrateur de
          votre club pour qu’il en crée un.
        </p>
      ) : (
        <OnboardingForm clubs={clubs} defaultName={user.name} />
      )}
    </main>
  )
}
