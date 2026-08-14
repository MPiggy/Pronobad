import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Mot de passe oublié — Betclichy',
}

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-3xl">
          🏸
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
          Mot de passe oublié
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-shuttle-text-soft">
          Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
        </p>
      </header>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/login" className="font-medium text-ink underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  )
}
