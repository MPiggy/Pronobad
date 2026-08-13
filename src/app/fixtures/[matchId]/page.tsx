import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireOnboardedUser } from '@/lib/auth/session'
import { getMatchForUser } from '@/lib/predictions/queries'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import {
  formatFullDate,
  formatPoints,
  formatTime,
  formatTimeRemaining,
} from '@/lib/format'
import { PageShell } from '@/components/page-shell'
import { Sheet } from '@/components/sheet'
import { ScoreComparison } from '@/components/score-line'
import { PredictionForm } from './prediction-form'

export const metadata: Metadata = {
  title: 'Rencontre — Pronobad',
}

/**
 * One fixture: the result if it is in, the member's prediction, and the entry
 * form while the fixture is still open.
 */
export default async function MatchPage({
  params,
}: {
  // Next 16: dynamic APIs are async.
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const user = await requireOnboardedUser()

  const match = await getMatchForUser({ matchId, userId: user.id })

  if (!match) notFound()

  // A fixture between two other clubs is not this member's business — and
  // treating it as missing avoids confirming which fixture ids exist.
  const concernsUserClub =
    match.homeTeam.clubId === user.clubId || match.awayTeam.clubId === user.clubId

  if (!concernsUserClub) notFound()

  const state = lockState(match)
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const { prediction } = match

  return (
    <PageShell
      title={`Journée ${match.round}`}
      subtitle={`${formatFullDate(match.playedAt)} · ${formatTime(match.playedAt)}`}
      action={
        <Link
          href="/fixtures"
          className="shrink-0 self-center rounded-md border border-line bg-sheet px-3 py-2 text-sm font-medium text-ink-soft transition-colors active:bg-shuttle"
        >
          Retour
        </Link>
      }
    >
      <div className="space-y-4">
        {/* The fixture itself: teams on the left, official score on the right. */}
        <Sheet>
          <div className="divide-y divide-line-soft">
            {[
              {
                name: match.homeTeam.name,
                division: match.homeTeam.division,
                score: match.homeScore,
              },
              {
                name: match.awayTeam.name,
                division: match.awayTeam.division,
                score: match.awayScore,
              },
            ].map((team) => (
              <div
                key={team.name}
                className="flex items-center justify-between gap-3 py-3.5 pl-4 pr-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{team.name}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {team.division}
                  </p>
                </div>
                {hasResult && (
                  <span className="num shrink-0 text-3xl font-semibold text-ink">
                    {team.score}
                  </span>
                )}
              </div>
            ))}
          </div>

          {!state.locked && (
            <p className="border-t border-line-soft bg-court-light/40 py-2.5 pl-4 pr-4 text-xs font-medium text-court-dark">
              {formatTimeRemaining(state.msRemaining)}
            </p>
          )}
        </Sheet>

        {/* The comparison this whole app exists to show. */}
        {(prediction || hasResult) && (
          <Sheet
            marker={
              prediction?.score
                ? prediction.score.points > 0
                  ? 'win'
                  : 'loss'
                : 'none'
            }
          >
            <div className="py-4 pl-4 pr-4">
              <ScoreComparison
                prediction={
                  prediction
                    ? { home: prediction.homeScore, away: prediction.awayScore }
                    : null
                }
                result={
                  hasResult
                    ? { home: match.homeScore!, away: match.awayScore! }
                    : null
                }
              />

              {prediction?.score && (
                <p className="mt-3 border-t border-line-soft pt-2.5 text-sm text-ink-soft">
                  {explainRule(prediction.score.ruleApplied as ScoringRule)}
                  <span className="ml-1.5 font-semibold text-ink">
                    {formatPoints(prediction.score.points)}
                  </span>
                </p>
              )}
            </div>
          </Sheet>
        )}

        {state.locked ? (
          <p className="rounded-lg border border-line bg-sheet px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
            {explainLock(state)}
            {!prediction && ' Vous n’aviez pas pronostiqué cette rencontre.'}
          </p>
        ) : (
          <Sheet>
            <div className="py-4 pl-4 pr-4">
              <h2 className="eyebrow mb-3.5">
                {prediction ? 'Modifier le pronostic' : 'Votre pronostic'}
              </h2>
              <PredictionForm
                matchId={match.id}
                homeTeamName={match.homeTeam.name}
                awayTeamName={match.awayTeam.name}
                prediction={prediction}
              />
            </div>
          </Sheet>
        )}
      </div>
    </PageShell>
  )
}
