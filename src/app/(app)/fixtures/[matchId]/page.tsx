import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { getMatchForUser } from '@/lib/predictions/queries'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import {
  formatFullDate,
  formatPoints,
  formatScore,
  formatTime,
  formatTimeRemaining,
} from '@/lib/format'
import { PageShell } from '@/components/page-shell'
import { PredictionForm } from './prediction-form'

export const metadata: Metadata = {
  title: 'Rencontre — Betclichy',
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
  const user = await requireUser()

  const match = await getMatchForUser({ matchId, userId: user.id })

  if (!match) notFound()

  const state = lockState(match)
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const { prediction } = match

  return (
    <PageShell
      title="Rencontre"
      subtitle={`Journée ${match.round} · ${formatFullDate(match.playedAt)}`}
      action={
        <Link
          href="/fixtures"
          className="shrink-0 rounded-lg border border-line bg-sheet px-3 py-2 text-sm font-medium text-ink-soft"
        >
          Retour
        </Link>
      }
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-sheet p-5">
          <div className="space-y-3">
            {[
              { name: match.homeTeam.name, division: match.homeTeam.division, score: match.homeScore },
              { name: match.awayTeam.name, division: match.awayTeam.division, score: match.awayScore },
            ].map((team) => (
              <div key={team.name} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{team.name}</p>
                  <p className="text-xs text-ink-soft">{team.division}</p>
                </div>
                {hasResult && (
                  <span className="shrink-0 text-2xl font-bold tabular-nums text-ink">
                    {team.score}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 border-t border-line pt-3 text-xs text-ink-soft">
            <span>Coup d’envoi à {formatTime(match.playedAt)}</span>
            {!state.locked && (
              <span className="flex items-center gap-1 font-medium text-court-dark">
                · <Clock aria-hidden className="size-3.5" />
                {formatTimeRemaining(state.msRemaining)}
              </span>
            )}
          </p>
        </section>

        {prediction && (
          <section className="rounded-2xl border border-line bg-sheet p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Votre pronostic
            </h2>
            <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
              {formatScore(prediction.homeScore, prediction.awayScore)}
            </p>
            {prediction.score && (
              <p className="mt-1 text-sm text-ink-soft">
                {explainRule(prediction.score.ruleApplied as ScoringRule)} —{' '}
                <span className="font-semibold text-ink">
                  {formatPoints(prediction.score.points)}
                </span>
              </p>
            )}
          </section>
        )}

        {state.locked ? (
          <p className="rounded-2xl border border-line bg-sheet px-4 py-3 text-sm leading-relaxed text-ink-soft">
            {explainLock(state)}
            {!prediction && ' Vous n’aviez pas pronostiqué cette rencontre.'}
          </p>
        ) : (
          <section className="rounded-2xl border border-line bg-sheet p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {prediction ? 'Modifier votre pronostic' : 'Votre pronostic'}
            </h2>
            <PredictionForm
              matchId={match.id}
              homeTeamName={match.homeTeam.name}
              awayTeamName={match.awayTeam.name}
              prediction={prediction}
            />
          </section>
        )}
      </div>
    </PageShell>
  )
}
