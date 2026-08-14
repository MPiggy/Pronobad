import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getMatchesForUser } from '@/lib/predictions/queries'
import { isLocked } from '@/lib/predictions/locking'
import { EmptyState, PageShell } from '@/components/page-shell'
import { MatchCard } from '@/components/match-card'

export const metadata: Metadata = {
  title: 'Rencontres — Betclichy',
}

/**
 * The member's home screen: the fixtures for the current season.
 *
 * Open fixtures come first and past ones are pushed below, because the only
 * action this app ever asks for is "predict the ones that are still open".
 */
export default async function FixturesPage() {
  const [user, season] = await Promise.all([requireUser(), getCurrentSeason()])

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

  const matches = await getMatchesForUser({
    seasonId: season.id,
    userId: user.id,
  })

  // One timestamp for the whole render: computing `new Date()` per card would
  // let two cards disagree about whether the same instant is past lock.
  const now = new Date()

  const open = matches.filter((match) => !isLocked(match, now))
  const closed = matches.filter((match) => isLocked(match, now)).reverse()

  const toPredict = open.filter((match) => !match.prediction).length

  return (
    <PageShell title="Rencontres" subtitle={season.name}>
      {matches.length === 0 ? (
        <EmptyState
          icon="🏸"
          title="Aucune rencontre"
          body="Les rencontres apparaîtront ici dès qu’elles auront été ajoutées."
        />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="open-heading">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2
                id="open-heading"
                className="text-sm font-semibold uppercase tracking-wide text-shuttle-text-soft"
              >
                À venir
              </h2>
              {toPredict > 0 && (
                <span className="text-xs font-medium text-court">
                  {toPredict} à pronostiquer
                </span>
              )}
            </div>

            {open.length === 0 ? (
              <p className="rounded-2xl border border-line bg-sheet px-4 py-3 text-sm text-ink-soft">
                Aucune rencontre ouverte aux pronostics pour le moment.
              </p>
            ) : (
              <ul className="space-y-3">
                {open.map((match) => (
                  <MatchCard key={match.id} match={match} now={now} />
                ))}
              </ul>
            )}
          </section>

          {closed.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2
                id="past-heading"
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-shuttle-text-soft"
              >
                Terminées
              </h2>
              <ul className="space-y-3">
                {closed.map((match) => (
                  <MatchCard key={match.id} match={match} now={now} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}
