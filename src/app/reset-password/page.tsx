import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe — Betclichy',
}

/**
 * Reached only via `/auth/callback` after a recovery link is verified —
 * that exchange is what leaves the member with the session this page's
 * action relies on to call `updateUser`.
 */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-3xl">
          🏸
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
          Choisissez un nouveau mot de passe
        </h1>
      </header>

      <ResetPasswordForm />
    </main>
  )
}
