import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = {
  title: 'Finaliser votre compte — Betclichy',
}

/**
 * Second half of account creation: the address is verified (the member is
 * already signed in, or `requireUser` below sends them back to `/login`), so
 * this collects the password and pseudo that make the account usable.
 *
 * `requireUser` reads the session cookie, so the whole page is runtime-bound;
 * Suspense is what lets it still prerender a shell rather than block.
 */
export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}

async function OnboardingContent() {
  const user = await requireUser()

  // Already set up — nothing left to do here.
  if (user.onboardedAt) redirect('/fixtures')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-3xl">
          🏸
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
          Finalisez votre compte
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-shuttle-text-soft">
          Adresse vérifiée : {user.email}. Choisissez un mot de passe et un
          pseudo.
        </p>
      </header>

      <OnboardingForm defaultName={user.name} />
    </main>
  )
}
