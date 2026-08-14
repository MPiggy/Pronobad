import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isDemoMode } from '@/lib/auth/demo'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Créer un compte — Betclichy',
}

export default function SignupPage() {
  // Demo mode has its own name-only flow at /login; signup does not apply.
  if (isDemoMode()) redirect('/login')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-3xl">
          🏸
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
          Créer un compte
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-shuttle-text-soft">
          Entrez votre adresse e-mail pour recevoir un lien de vérification.
        </p>
      </header>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-ink underline">
          Se connecter
        </Link>
      </p>
    </main>
  )
}
