import type { Metadata } from 'next'
import Link from 'next/link'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getPredictionHistory } from '@/lib/predictions/queries'
import { getClubLeaderboard } from '@/lib/leaderboard/queries'
import { explainRule, ScoringRule } from '@/lib/scoring/rules'
import { formatMatchDay, formatScore } from '@/lib/format'
import { EmptyState, PageShell } from '@/components/page-shell'

export const metadata: Metadata = {
  title: 'Profil — Pronobad',
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-white px-3 py-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs leading-tight text-ink-soft">{label}</p>
    </div>
  )
}

/**
 * The member's own season: their standing, their totals, and every prediction
 * they have made with the points it earned.
 *
 * The history exists to answer "why do I have this many points" — so each row
 * shows the prediction, the actual result and the rule that was applied,
 * rather than just a number.
 */
export default async function ProfilePage() {
  const user = await requireOnboardedUser()

  const [club, season] = await Promise.all([
    db.club.findUnique({ where: { id: user.clubId }, select: { name: true } }),
    getCurrentSeason(),
  ])

  if (!season) {
    return (
      <PageShell title="Profil" subtitle={user.name}>
        <EmptyState
          icon="👤"
          title="Aucune saison ouverte"
          body="Votre historique apparaîtra dès qu’une saison sera en cours."
        />
      </PageShell>
    )
  }

  const [history, leaderboard] = await Promise.all([
    getPredictionHistory({ userId: user.id, seasonId: season.id }),
    getClubLeaderboard({ clubId: user.clubId, seasonId: season.id }),
  ])

  const me = leaderboard.find((row) => row.userId === user.id)
  const points = me?.points ?? 0
  const exactCount = me?.exactCount ?? 0

  return (
    <PageShell
      title="Profil"
      subtitle={`${user.name} · ${club?.name ?? 'Votre club'}`}
      action={
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink-soft"
          >
            Déconnexion
          </button>
        </form>
      }
    >
      <div className="space-y-6">
        <section aria-label="Statistiques de la saison" className="flex gap-3">
          <Stat value={points} label="points" />
          <Stat value={me ? `${me.rank}${me.rank === 1 ? 'er' : 'e'}` : '—'} label="au classement" />
          <Stat value={exactCount} label={`score${exactCount > 1 ? 's' : ''} exact${exactCount > 1 ? 's' : ''}`} />
        </section>

        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft"
          >
            Historique · {season.name}
          </h2>

          {history.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucun pronostic"
              body="Vos pronostics apparaîtront ici. Rendez-vous dans l’onglet Rencontres pour commencer."
            />
          ) : (
            <ul className="space-y-3">
              {history.map((row) => {
                const { match } = row
                const hasResult =
                  match.homeScore !== null && match.awayScore !== null

                return (
                  <li key={row.id}>
                    <Link
                      href={`/fixtures/${match.id}`}
                      className="block rounded-2xl border border-line bg-white p-4 transition-colors active:bg-shuttle"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <time
                          dateTime={match.playedAt.toISOString()}
                          className="text-xs font-medium text-ink-soft"
                        >
                          {formatMatchDay(match.playedAt)}
                        </time>

                        {row.score ? (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.score.ruleApplied === ScoringRule.ExactScore
                                ? 'bg-win/15 text-ink'
                                : row.score.points > 0
                                  ? 'bg-court-light text-court-dark'
                                  : 'bg-loss/10 text-ink-soft'
                            }`}
                          >
                            +{row.score.points} ·{' '}
                            {explainRule(row.score.ruleApplied as ScoringRule)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-pending/15 px-2.5 py-1 text-xs font-semibold text-ink">
                            En attente
                          </span>
                        )}
                      </div>

                      <p className="truncate text-sm font-medium text-ink">
                        {match.homeTeam.name} — {match.awayTeam.name}
                      </p>

                      <div className="mt-2 flex gap-4 text-xs text-ink-soft">
                        <span>
                          Pronostic :{' '}
                          <span className="font-semibold tabular-nums text-ink">
                            {formatScore(row.homeScore, row.awayScore)}
                          </span>
                        </span>
                        {hasResult && (
                          <span>
                            Résultat :{' '}
                            <span className="font-semibold tabular-nums text-ink">
                              {formatScore(match.homeScore!, match.awayScore!)}
                            </span>
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  )
}
