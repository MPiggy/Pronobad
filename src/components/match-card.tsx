import Link from 'next/link'
import { lockState } from '@/lib/predictions/locking'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import {
  formatMatchDateTime,
  formatPoints,
  formatScore,
  formatTimeRemaining,
} from '@/lib/format'

/**
 * One fixture in a list.
 *
 * The card's whole job is answering "do I need to do something about this
 * one?" at a glance, so the status pill is the loudest element rather than the
 * team names — a member scrolling on a phone is scanning for what is still open.
 */

export type MatchCardData = {
  id: string
  playedAt: Date
  locksAt: Date
  resultEnteredAt: Date | null
  homeScore: number | null
  awayScore: number | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  prediction: {
    homeScore: number
    awayScore: number
    score: { points: number; ruleApplied: string } | null
  } | null
}

function StatusPill({ tone, children }: { tone: 'open' | 'pending' | 'done' | 'missed'; children: string }) {
  const tones = {
    open: 'bg-court-light text-court-dark',
    pending: 'bg-pending/15 text-ink',
    done: 'bg-win/15 text-ink',
    missed: 'bg-loss/10 text-ink-soft',
  } as const

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function MatchCard({ match, now }: { match: MatchCardData; now: Date }) {
  const state = lockState(match, now)
  const { prediction } = match
  const hasResult = match.homeScore !== null && match.awayScore !== null

  return (
    <li>
      <Link
        href={`/fixtures/${match.id}`}
        className="block rounded-2xl border border-line bg-sheet p-4 transition-colors active:bg-shuttle"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <time
            dateTime={match.playedAt.toISOString()}
            className="text-xs font-medium text-ink-soft"
          >
            {formatMatchDateTime(match.playedAt)}
          </time>

          {!state.locked && !prediction && <StatusPill tone="open">À pronostiquer</StatusPill>}
          {!state.locked && prediction && <StatusPill tone="pending">Pronostic enregistré</StatusPill>}
          {state.locked && !hasResult && <StatusPill tone="pending">Fermé</StatusPill>}
          {state.locked && hasResult && (
            prediction?.score
              ? <StatusPill tone={prediction.score.points > 0 ? 'done' : 'missed'}>
                  {formatPoints(prediction.score.points)}
                </StatusPill>
              : <StatusPill tone="missed">Terminé</StatusPill>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium text-ink">{match.homeTeam.name}</p>
            <p className="truncate text-sm font-medium text-ink">{match.awayTeam.name}</p>
          </div>

          {hasResult && (
            <div className="shrink-0 text-right">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Résultat</p>
              <p className="text-lg font-bold tabular-nums text-ink">
                {formatScore(match.homeScore!, match.awayScore!)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
          {prediction ? (
            <span className="text-ink-soft">
              Votre pronostic :{' '}
              <span className="font-semibold tabular-nums text-ink">
                {formatScore(prediction.homeScore, prediction.awayScore)}
              </span>
              {prediction.score && (
                <> — {explainRule(prediction.score.ruleApplied as ScoringRule)}</>
              )}
            </span>
          ) : (
            <span className="text-ink-soft">
              {state.locked ? 'Aucun pronostic' : 'Vous n’avez pas encore pronostiqué'}
            </span>
          )}

          {!state.locked && (
            <span className="shrink-0 font-medium text-court-dark">
              {formatTimeRemaining(state.msRemaining)}
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}
