import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Lien invalide — Pronobad',
}

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="eyebrow mb-3">Connexion</p>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-ink">
        Ce lien n’est plus valide
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-soft">
        Les liens de connexion expirent au bout d’une heure et ne peuvent servir
        qu’une seule fois. Demandez-en un nouveau pour continuer.
      </p>
      <Link
        href="/login"
        className="flex w-full items-center justify-center rounded-md bg-court px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-opacity active:opacity-90"
      >
        Demander un nouveau lien
      </Link>
    </main>
  )
}
