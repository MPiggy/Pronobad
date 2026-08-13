import type { Metadata } from 'next'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getClubMatchesForUser } from '@/lib/predictions/queries'
import { isLocked } from '@/lib/predictions/locking'
import { EmptyState, PageShell } from '@/components/page-shell'
import { SectionHeading } from '@/components/sheet'
import { MatchCard } from '@/components/match-card'

export const metadata: Metadata = {
  title: 'Rencontres — Pronobad',
}

/**
 * The member's home screen: their club's fixtures for the current season.
 *
 * Open fixtures come first and past ones are pushed below, because the only
 * action this app ever asks for is "predict the ones that are still open".
 */
export default async function FixturesPage() {
  const user = await requireOnboardedUser()

  const [club, season] = await Promise.all([
    db.club.findUnique({ where: { id: user.clubId }, select: { name: true } }),
    getCurrentSeason(),
  ])

  if (!season) {
    return (
      <PageShell title="Rencontres" subtitle={club?.name}>
        <EmptyState
          title="Aucune saison ouverte"
          body="Aucune saison n’est encore configurée. Contactez l’administrateur de votre club."
        />
      </PageShell>
    )
  }

  const matches = await getClubMatchesForUser({
    clubId: user.clubId,
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
    <PageShell
      title="Rencontres"
      subtitle={`${club?.name ?? 'Votre club'} · ${season.name}`}
    >
      {matches.length === 0 ? (
        <EmptyState
          title="Aucune rencontre"
          body="Les rencontres de votre club apparaîtront ici dès qu’elles auront été ajoutées."
        />
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="open-heading">
            <SectionHeading
              id="open-heading"
              aside={toPredict > 0 ? `${toPredict} à pronostiquer` : undefined}
            >
              À venir
            </SectionHeading>

            {open.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-sheet px-4 py-3.5 text-sm text-ink-soft">
                Aucune rencontre ouverte aux pronostics pour le moment.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {open.map((match) => (
                  <MatchCard key={match.id} match={match} now={now} />
                ))}
              </ul>
            )}
          </section>

          {closed.length > 0 && (
            <section aria-labelledby="past-heading">
              <SectionHeading id="past-heading">Terminées</SectionHeading>
              <ul className="space-y-2.5">
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
