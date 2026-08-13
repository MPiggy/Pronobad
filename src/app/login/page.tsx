import type { Metadata } from 'next'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { isDemoMode } from '@/lib/auth/demo'
import { DemoLoginForm, LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Connexion — Pronobad',
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
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Connexion à Pronobad
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {demo
            ? 'Entrez votre nom pour essayer l’application.'
            : 'Entrez votre adresse e-mail pour recevoir un lien de connexion.'}
        </p>
      </header>

      {demo ? (
        <DemoLoginForm next={safeRedirectPath(next)} />
      ) : (
        <LoginForm next={safeRedirectPath(next)} />
      )}
    </main>
  )
}
