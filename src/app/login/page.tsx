import type { Metadata } from 'next'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { LoginForm } from './login-form'

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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-8">
        <p className="eyebrow mb-3">Pronobad</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Connexion
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Entrez votre adresse e-mail pour recevoir un lien de connexion.
        </p>
      </header>

      <LoginForm next={safeRedirectPath(next)} />
    </main>
  )
}
