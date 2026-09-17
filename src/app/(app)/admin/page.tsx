import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { forbidden } from 'next/navigation'
import { getActor } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getMaxScore } from '@/lib/settings/queries'
import { isLocked } from '@/lib/predictions/locking'
import { EmptyState, PageShell, SectionHeading } from '@/components/page-shell'
import { FixtureCard, type AdminFixture, type FixtureStatus } from './fixture-card'
import { NewFixtureButton } from './new-fixture-button'

export const metadata: Metadata = {
  title: 'Admin — BetClichy',
}

/**
 * The season's fixtures, for admins: create them, edit them, enter results.
 *
 * Grouped by what the admin has to do rather than listed by date — the
 * fixtures waiting for a result come first, because entering results is the
 * one job that has to be done after every match night and the reason an
 * admin opens this page.
 *
 * The actions re-check permissions regardless; this page's gate is
 * presentation, not enforcement. The superadmin check reads the session
 * cookie, so the whole page is runtime-bound — Suspense is what lets the
 * route still prerender a shell.
 */
export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  )
}

const settingsLink = (
  <Link
    href="/admin/manage"
    className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-line bg-sheet px-3 text-xs font-semibold text-court-dark transition-colors active:bg-shuttle/5"
  >
    Réglages
  </Link>
)

async function AdminContent() {
  // `getActor` goes through `requireOnboardedUser`, so this is also the
  // signed-in and onboarding gate for the page.
  const actor = await getActor()

  // Members have no business here. `forbidden()` renders a 403 rather than
  // redirecting, so the failure is visible instead of looking like a bad link.
  if (!actor.isSuperadmin) forbidden()

  const season = await getCurrentSeason()

  if (!season) {
    return (
      <PageShell title="Admin" action={settingsLink}>
        <EmptyState
          icon="⚙️"
          title="Aucune saison ouverte"
          body="Créez une saison pour pouvoir programmer des rencontres."
          action={
            <Link
              href="/admin/manage"
              className="inline-flex min-h-11 items-center rounded-xl bg-court px-4 text-sm font-semibold text-ink"
            >
              Créer une saison
            </Link>
          }
        />
      </PageShell>
    )
  }

  const [defaultMaxScore, teams, matches] = await Promise.all([
    getMaxScore(),
    db.team.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.match.findMany({
      where: { seasonId: season.id },
      select: {
        id: true,
        round: true,
        playedAt: true,
        locksAt: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        maxScore: true,
        resultEnteredAt: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        _count: { select: { predictions: true } },
      },
      orderBy: { playedAt: 'asc' },
    }),
  ])

  const now = new Date()

  const fixtures: AdminFixture[] = matches.map((match) => {
    const hasResult = match.homeScore !== null && match.awayScore !== null
    const status: FixtureStatus = hasResult
      ? 'finished'
      : isLocked(match, now)
        ? 'awaiting'
        : 'upcoming'

    return {
      id: match.id,
      round: match.round,
      playedAt: match.playedAt,
      locksAt: match.locksAt,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      maxScore: match.maxScore,
      predictionCount: match._count.predictions,
      status,
    }
  })

  const byStatus = (status: FixtureStatus) =>
    fixtures.filter((fixture) => fixture.status === status)

  // Awaiting and upcoming read oldest-first: the result owed longest, then the
  // next match to prepare. Finished ones read newest-first, the way a results
  // page does.
  const groups = [
    { title: 'Résultat attendu', items: byStatus('awaiting') },
    { title: 'À venir', items: byStatus('upcoming') },
    { title: 'Terminées', items: byStatus('finished').reverse() },
  ].filter((group) => group.items.length > 0)

  const canCreate = teams.length >= 2

  return (
    <PageShell
      title="Admin"
      subtitle={`Rencontres · ${season.name}`}
      action={
        <div className="flex shrink-0 items-center gap-2">
          {settingsLink}
          {canCreate && (
            <NewFixtureButton teams={teams} defaultMaxScore={defaultMaxScore} />
          )}
        </div>
      }
    >
      {!canCreate ? (
        <EmptyState
          icon="🏸"
          title="Pas assez d’équipes"
          body="Il faut au moins deux équipes dans la saison pour programmer une rencontre."
          action={
            <Link
              href="/admin/manage"
              className="inline-flex min-h-11 items-center rounded-xl bg-court px-4 text-sm font-semibold text-ink"
            >
              Ajouter des équipes
            </Link>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="🏸"
          title="Aucune rencontre"
          body="Programmez la première rencontre de la saison."
          action={
            <NewFixtureButton
              teams={teams}
              defaultMaxScore={defaultMaxScore}
              variant="text"
            />
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.title}>
              <SectionHeading aside={group.items.length}>{group.title}</SectionHeading>
              <ul className="space-y-3">
                {group.items.map((fixture) => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    teams={teams}
                    defaultMaxScore={defaultMaxScore}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  )
}
