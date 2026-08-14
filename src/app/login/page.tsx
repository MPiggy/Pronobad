import type { Metadata } from 'next'
import Link from 'next/link'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { isDemoMode } from '@/lib/auth/demo'
import { DemoLoginForm, LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion — Betclichy',
}

export default async function LoginPage({
  searchParams,
}: {
  // Next 16: dynamic APIs are async.
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const demo = isDemoMode()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8 text-center">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-court text-3xl">
          🏸
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
          Connexion à Betclichy
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-shuttle-text-soft">
          {demo
            ? 'Entrez votre nom pour essayer l’application.'
            : 'Entrez votre e-mail et votre mot de passe.'}
        </p>
      </header>

      {demo ? (
        <DemoLoginForm next={safeRedirectPath(next)} />
      ) : (
        <>
          <LoginForm next={safeRedirectPath(next)} />

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <Link href="/forgot-password" className="text-ink-soft underline">
              Mot de passe oublié ?
            </Link>
            <p className="text-ink-soft">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="font-medium text-ink underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </>
      )}
    </main>
  )
}
