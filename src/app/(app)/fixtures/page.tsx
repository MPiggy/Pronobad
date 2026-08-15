import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireOnboardedUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getNextMatchForUser } from '@/lib/predictions/queries'
import { EmptyState, PageShell } from '@/components/page-shell'
import { Skeleton, SkeletonShell } from '@/components/skeleton'
import { NextMatchHero } from '../home/next-match-hero'

export const metadata: Metadata = {
  title: 'Rencontres — Betclichy',
}

/**
 * The app's landing tab: just the next fixture, big, with a countdown and a
 * one-tap path to predicting it. The full list lives on /home — this screen
 * answers "what's next, and have I already played it?" without asking a
 * member to scan a list first.
 */
export default function FixturesPage() {
  return (
    <Suspense fallback={<FixturesSkeleton />}>
      <FixturesContent />
    </Suspense>
  )
}

/** One tall block for the hero card, plus the "see all fixtures" link under it. */
function FixturesSkeleton() {
  return (
    <SkeletonShell>
      <Skeleton className="h-[340px] rounded-3xl" />
      <Skeleton className="mx-auto mt-6 h-5 w-48" />
    </SkeletonShell>
  )
}

async function FixturesContent() {
  const [user, season] = await Promise.all([
    requireOnboardedUser(),
    getCurrentSeason(),
  ])

  if (!season) {
    return (
      <PageShell title="Rencontres">
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
    <PageShell title="Rencontres" subtitle={season.name}>
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
        href="/home"
        className="mt-6 block text-center text-sm font-medium text-court"
      >
        Voir toutes les rencontres →
      </Link>
    </PageShell>
  )
}
