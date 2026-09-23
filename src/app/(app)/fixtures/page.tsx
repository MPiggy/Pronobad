import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireOnboardedUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getMatchesForUser, getNextMatchForUser } from '@/lib/predictions/queries'
import { getLeaderboard } from '@/lib/leaderboard/queries'
import { getMaxScore } from '@/lib/settings/queries'
import { resolveMaxScore } from '@/lib/predictions/score-field'
import { pickLastResult, unpredictedClosingSoon } from '@/lib/predictions/home'
import { EmptyState, PageShell } from '@/components/page-shell'
import { Skeleton, SkeletonShell } from '@/components/skeleton'
import { NextMatchHero } from '../home/next-match-hero'
import { SeasonStats } from '../home/season-stats'
import { ClosingSoonBanner } from '../home/closing-soon-banner'
import { LastResultCard } from '../home/last-result-card'

export const metadata: Metadata = {
  title: 'Rencontres — Betclichy',
}

/**
 * The app's landing tab: the member's season at a glance, built around the
 * next fixture — big, with a countdown and a one-tap path to predicting it.
 *
 * Top to bottom: their standing, a nudge if an unpredicted fixture is about to
 * close, the next fixture, and how their last prediction scored. The full list
 * lives on /home — this screen answers "what's next, and how am I doing?"
 * without asking a member to scan a list first.
 */
export default function FixturesPage() {
  return (
    <Suspense fallback={<FixturesSkeleton />}>
      <FixturesContent />
    </Suspense>
  )
}

/** Stats row, hero card, last-result card, then the "see all fixtures" link. */
function FixturesSkeleton() {
  return (
    <SkeletonShell>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-5 h-[290px] rounded-3xl" />
      <Skeleton className="mt-5 h-[170px] rounded-2xl" />
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

  // One timestamp for the whole render, so the banner and the hero can never
  // disagree about whether a fixture is still open.
  const now = new Date()
  const [match, matches, leaderboard, maxScore] = await Promise.all([
    getNextMatchForUser({ seasonId: season.id, userId: user.id, now }),
    getMatchesForUser({ seasonId: season.id, userId: user.id }),
    getLeaderboard({ seasonId: season.id }),
    getMaxScore(),
  ])

  const lastResult = pickLastResult(matches)
  const closingSoon = unpredictedClosingSoon(matches, now)
  // A member with no scored prediction has no leaderboard row yet.
  const myStanding = leaderboard.find((row) => row.userId === user.id)

  return (
    <PageShell title="Rencontres" subtitle={season.name}>
      <div className="space-y-5">
        <SeasonStats
          rank={myStanding?.rank ?? null}
          rankedCount={leaderboard.length}
          points={myStanding?.points ?? 0}
          predictedCount={matches.filter((entry) => entry.prediction).length}
          matchCount={matches.length}
        />

        {closingSoon && (
          <ClosingSoonBanner
            count={closingSoon.count}
            msUntilFirst={closingSoon.msUntilFirst}
          />
        )}

        {match ? (
          <NextMatchHero
            match={match}
            now={now}
            maxScore={resolveMaxScore(match.maxScore, maxScore)}
          />
        ) : (
          <EmptyState
            icon="🏸"
            title="Aucune rencontre à venir"
            body="Revenez plus tard : la prochaine rencontre apparaîtra ici dès qu’elle sera programmée."
          />
        )}

        {lastResult && <LastResultCard match={lastResult} />}
      </div>

      <Link
        href="/home"
        className="mt-6 block text-center text-sm font-medium text-court"
      >
        Voir toutes les rencontres →
      </Link>
    </PageShell>
  )
}
