import type { Metadata } from 'next'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getClubLeaderboard } from '@/lib/leaderboard/queries'
import { EmptyState, PageShell } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Classement — Pronobad',
}

export default async function LeaderboardPage() {
  const user = await requireOnboardedUser()

  const [club, season] = await Promise.all([
    db.club.findUnique({ where: { id: user.clubId }, select: { name: true } }),
    getCurrentSeason(),
  ])

  if (!season) {
    return (
      <PageShell title="Classement" subtitle={club?.name}>
        <EmptyState
          title="Aucune saison ouverte"
          body="Le classement apparaîtra dès qu’une saison sera en cours."
        />
      </PageShell>
    )
  }

  const rows = await getClubLeaderboard({ clubId: user.clubId, seasonId: season.id })

  return (
    <PageShell
      title="Classement"
      subtitle={`${club?.name ?? 'Votre club'} · ${season.name}`}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="Classement vide"
          body="Les points apparaîtront ici dès qu’une rencontre aura été jouée et son résultat saisi."
        />
      ) : (
        /*
         * A real table: the leaderboard is tabular data, and a table gives
         * screen readers the row/column relationships that a list of divs
         * throws away.
         */
        <div className="overflow-hidden rounded-lg border border-line bg-sheet">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Classement des pronostiqueurs, {club?.name} — {season.name}
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="eyebrow py-2.5 pl-4 pr-2 font-semibold">
                  #
                </th>
                <th scope="col" className="eyebrow py-2.5 pr-2 font-semibold">
                  Membre
                </th>
                <th
                  scope="col"
                  className="eyebrow py-2.5 pr-4 text-right font-semibold"
                >
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((row) => {
                const isMe = row.userId === user.id

                return (
                  <tr
                    key={row.userId}
                    aria-current={isMe ? 'true' : undefined}
                    className={isMe ? 'bg-court-light/50' : undefined}
                  >
                    <td className="num py-3 pl-4 pr-2 align-middle text-sm font-semibold text-ink-soft">
                      {/* Rank is the row's label, so it stays plain: the top
                          three earn their place by position, not decoration. */}
                      {row.rank}
                    </td>

                    <td className="py-3 pr-2 align-middle">
                      <p className="truncate text-sm font-medium text-ink">
                        {row.name}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-court-dark">
                            vous
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        <span className="num">{row.scoredCount}</span> pronostic
                        {row.scoredCount > 1 ? 's' : ''} ·{' '}
                        <span className="num">{row.exactCount}</span> exact
                        {row.exactCount > 1 ? 's' : ''}
                      </p>
                    </td>

                    <td className="num py-3 pr-4 text-right align-middle text-lg font-semibold text-ink">
                      {row.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 px-1 text-xs leading-relaxed text-ink-faint">
        Score exact : 3 points. Bon vainqueur : 1 point. Les points sont figés au
        moment de la saisie du résultat.
      </p>
    </PageShell>
  )
}
