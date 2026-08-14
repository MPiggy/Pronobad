import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getNextMatchForUser } from '@/lib/predictions/queries'
import { EmptyState, PageShell } from '@/components/page-shell'
import { NextMatchHero } from './next-match-hero'

export const metadata: Metadata = {
  title: 'Accueil — Betclichy',
}

/**
 * The app's landing tab: just the next fixture, big, with a countdown and a
 * one-tap path to predicting it. The full list already lives on /fixtures —
 * this screen answers "what's next, and have I already played it?" without
 * asking a member to scan a list first.
 */
export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const [user, season] = await Promise.all([requireUser(), getCurrentSeason()])

  if (!season) {
    return (
      <PageShell title="Accueil">
        <EmptyState
          icon="📅"
          title="Aucune saison ouverte"
          body="Aucune saison n’est encore configurée. Contactez un administrateur."
        />
      </PageShell>
    )
  }

  const now = new Date()
  const match = await getNextMatchForUser({ seasonId: season.id, userId: user.id, now })

  return (
    <PageShell title="Accueil" subtitle={season.name}>
      {match ? (
        <NextMatchHero match={match} now={now} />
      ) : (
        <EmptyState
          icon="🏸"
          title="Aucune rencontre à venir"
          body="Revenez plus tard : la prochaine rencontre apparaîtra ici dès qu’elle sera programmée."
        />
      )}

      <Link
        href="/fixtures"
        className="mt-6 block text-center text-sm font-medium text-court"
      >
        Voir toutes les rencontres →
      </Link>
    </PageShell>
  )
}
