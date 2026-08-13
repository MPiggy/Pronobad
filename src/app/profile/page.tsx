import type { Metadata } from 'next'
import Link from 'next/link'
import { requireOnboardedUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getPredictionHistory } from '@/lib/predictions/queries'
import { getClubLeaderboard } from '@/lib/leaderboard/queries'
import { explainRule, ScoringRule } from '@/lib/scoring/rules'
import { formatMatchDay } from '@/lib/format'
import { EmptyState, PageShell } from '@/components/page-shell'
import { SectionHeading, Sheet, StatusLabel } from '@/components/sheet'
import { ScoreLine } from '@/components/score-line'

export const metadata: Metadata = {
  title: 'Profil — Pronobad',
}

/** One figure from the member's season, set large enough to read at a glance. */
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 py-3.5 text-center">
      <p className="num text-2xl font-semibold leading-none text-ink">{value}</p>
      <p className="eyebrow mt-1.5">{label}</p>
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
            className="shrink-0 self-center rounded-md border border-line bg-sheet px-3 py-2 text-sm font-medium text-ink-soft transition-colors active:bg-shuttle"
          >
            Déconnexion
          </button>
        </form>
      }
    >
      <div className="space-y-6">
        <Sheet>
          <div className="flex divide-x divide-line-soft">
            <Stat value={points} label="points" />
            <Stat value={me ? `${me.rank}${me.rank === 1 ? 'er' : 'e'}` : '—'} label="au classement" />
            <Stat
              value={exactCount}
              label={`exact${exactCount > 1 ? 's' : ''}`}
            />
          </div>
        </Sheet>

        <section aria-labelledby="history-heading">
          <SectionHeading id="history-heading">
            Historique · {season.name}
          </SectionHeading>

          {history.length === 0 ? (
            <EmptyState
              title="Aucun pronostic"
              body="Vos pronostics apparaîtront ici une fois enregistrés."
              action={
                <Link
                  href="/fixtures"
                  className="inline-flex rounded-md bg-court px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Voir les rencontres
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {history.map((row) => {
                const { match } = row
                const hasResult =
                  match.homeScore !== null && match.awayScore !== null

                const marker = row.score
                  ? row.score.points > 0
                    ? 'win'
                    : 'loss'
                  : 'pending'

                return (
                  <li key={row.id}>
                    <Link href={`/fixtures/${match.id}`} className="block">
                      <Sheet marker={marker} interactive>
                        <div className="py-3.5 pl-4 pr-4">
                          <div className="mb-2 flex items-baseline justify-between gap-3">
                            <time
                              dateTime={match.playedAt.toISOString()}
                              className="text-xs font-medium text-ink-soft"
                            >
                              {formatMatchDay(match.playedAt)}
                            </time>
                            <StatusLabel>
                              {row.score
                                ? `${explainRule(row.score.ruleApplied as ScoringRule)} · ${row.score.points > 0 ? '+' : ''}${row.score.points}`
                                : 'En attente'}
                            </StatusLabel>
                          </div>

                          <p className="truncate text-sm font-medium text-ink">
                            {match.homeTeam.name}
                            <span className="mx-1.5 text-ink-faint">contre</span>
                            {match.awayTeam.name}
                          </p>

                          <div className="mt-2.5 flex items-baseline gap-5 border-t border-line-soft pt-2.5 text-xs text-ink-soft">
                            <span className="flex items-baseline gap-1.5">
                              Pronostic
                              <ScoreLine
                                home={row.homeScore}
                                away={row.awayScore}
                                size="sm"
                              />
                            </span>
                            {hasResult && (
                              <span className="flex items-baseline gap-1.5">
                                Résultat
                                <ScoreLine
                                  home={match.homeScore!}
                                  away={match.awayScore!}
                                  size="sm"
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </Sheet>
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
