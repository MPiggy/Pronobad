import Link from 'next/link'
import { lockState } from '@/lib/predictions/locking'
import { explainRule, ScoringRule } from '@/lib/scoring/rules'
import {
  formatMatchDateTime,
  formatPoints,
  formatTimeRemaining,
} from '@/lib/format'
import { Sheet, StatusLabel, type SheetMarker } from '@/components/sheet'
import { ScoreLine } from '@/components/score-line'

/**
 * One fixture in a list.
 *
 * The card answers "do I need to do something about this one?" at a glance.
 * State is carried by the left edge-marker rather than a badge, so scanning a
 * list means following one vertical line down the column.
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

/** The single line of state shown at the top-right of a fixture. */
function describeState(
  match: MatchCardData,
  now: Date,
): { marker: SheetMarker; label: string } {
  const state = lockState(match, now)
  const hasResult = match.homeScore !== null && match.awayScore !== null

  if (!state.locked) {
    return match.prediction
      ? { marker: 'pending', label: 'Pronostiqué' }
      : { marker: 'action', label: 'À pronostiquer' }
  }

  if (!hasResult) {
    return { marker: 'pending', label: 'En attente du résultat' }
  }

  if (!match.prediction?.score) {
    return { marker: 'none', label: 'Terminé' }
  }

  return match.prediction.score.points > 0
    ? { marker: 'win', label: formatPoints(match.prediction.score.points) }
    : { marker: 'loss', label: 'Aucun point' }
}

export function MatchCard({ match, now }: { match: MatchCardData; now: Date }) {
  const state = lockState(match, now)
  const { prediction } = match
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const { marker, label } = describeState(match, now)

  return (
    <li>
      <Link href={`/fixtures/${match.id}`} className="block">
        <Sheet marker={marker} interactive>
          <div className="py-3.5 pl-4 pr-4">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <time
                dateTime={match.playedAt.toISOString()}
                className="text-xs font-medium text-ink-soft"
              >
                {formatMatchDateTime(match.playedAt)}
              </time>
              <StatusLabel>{label}</StatusLabel>
            </div>

            {/* Teams and result share one grid so the scores stack in a column
                that stays aligned however long the team names are. */}
            <div className="space-y-1.5">
              {[
                { name: match.homeTeam.name, score: match.homeScore },
                { name: match.awayTeam.name, score: match.awayScore },
              ].map((team) => (
                <div
                  key={team.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="truncate text-sm font-medium text-ink">
                    {team.name}
                  </span>
                  {hasResult && (
                    <span className="num shrink-0 text-lg font-semibold text-ink">
                      {team.score}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line-soft pt-2.5">
              {prediction ? (
                <span className="flex items-baseline gap-1.5 text-xs text-ink-soft">
                  Pronostic
                  <ScoreLine
                    home={prediction.homeScore}
                    away={prediction.awayScore}
                    size="sm"
                  />
                  {prediction.score && (
                    <span className="text-ink-faint">
                      {explainRule(prediction.score.ruleApplied as ScoringRule)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-ink-faint">
                  {state.locked ? 'Pas de pronostic' : 'Pas encore pronostiqué'}
                </span>
              )}

              {!state.locked && (
                <span className="shrink-0 text-xs font-medium text-court-dark">
                  {formatTimeRemaining(state.msRemaining)}
                </span>
              )}
            </div>
          </div>
        </Sheet>
      </Link>
    </li>
  )
}
