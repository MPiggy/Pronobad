import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getLeaderboard } from '@/lib/leaderboard/queries'
import { EmptyState, PageShell } from '@/components/page-shell'
import { RulesButton } from './rules-button'

export const metadata: Metadata = {
  title: 'Classement — BetClichy',
}

/** Medals for the top three; everyone else gets their number. */
const MEDALS = ['🥇', '🥈', '🥉'] as const

export default async function LeaderboardPage() {
  const [user, season] = await Promise.all([requireUser(), getCurrentSeason()])

  if (!season) {
    return (
      <PageShell title="Classement">
        <EmptyState
          icon="🏆"
          title="Aucune saison ouverte"
          body="Le classement apparaîtra dès qu’une saison sera en cours."
        />
      </PageShell>
    )
  }

  const rows = await getLeaderboard({ seasonId: season.id })

  return (
    <PageShell title="Classement" subtitle={season.name} action={<RulesButton />}>
      {rows.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Classement vide"
          body="Les points apparaîtront ici dès qu’une rencontre aura été jouée et son résultat saisi."
        />
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => {
            const isMe = row.userId === user.id
            const medal = MEDALS[row.rank - 1]

            return (
              <li
                key={row.userId}
                aria-current={isMe ? 'true' : undefined}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isMe ? 'border-court bg-court-light' : 'border-line bg-sheet'
                }`}
              >
                <span
                  className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-ink-soft"
                  aria-label={`Position ${row.rank}`}
                >
                  {medal ?? row.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {row.name}
                    {isMe && (
                      <span className="ml-1.5 text-xs font-normal text-court-dark">
                        (vous)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {row.scoredCount} pronostic{row.scoredCount > 1 ? 's' : ''} ·{' '}
                    {row.exactCount} score{row.exactCount > 1 ? 's' : ''} exact
                    {row.exactCount > 1 ? 's' : ''}
                  </p>
                </div>

                <span className="shrink-0 text-lg font-bold tabular-nums text-ink">
                  {row.points}
                  <span className="ml-1 text-xs font-normal text-ink-soft">pts</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </PageShell>
  )
}
