import type { Metadata } from 'next'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Rencontres — Pronobad',
}

/**
 * Placeholder home for a signed-in member.
 *
 * The fixture list and prediction entry land here in the next step; for now
 * this exists so the auth flow has a real destination to redirect to.
 */
export default async function FixturesPage() {
  const user = await requireOnboardedUser()

  const club = await db.club.findUnique({
    where: { id: user.clubId },
    select: { name: true },
  })

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-[calc(2rem+var(--safe-top))]">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Rencontres
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {club?.name ?? 'Votre club'} — {user.name}
          </p>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-soft"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink-soft">
        Les rencontres de votre club apparaîtront ici.
      </p>
    </main>
  )
}
