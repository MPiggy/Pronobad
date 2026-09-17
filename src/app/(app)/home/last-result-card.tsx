import type { MatchCardData } from '@/components/match-card'
import { explainRule, ScoringRule } from '@/lib/scoring/rules'
import { formatFullDate, formatScore } from '@/lib/format'

const RULE_ICONS: Record<ScoringRule, string> = {
  [ScoringRule.ExactScore]: '🎯',
  [ScoringRule.CorrectOutcome]: '👍',
  [ScoringRule.Wrong]: '😬',
}

/**
 * How the member did on the latest result — the moment a prediction pays off,
 * which otherwise only surfaces inside a past fixture's modal.
 */
export function LastResultCard({ match }: { match: MatchCardData }) {
  const { prediction } = match
  const score = prediction?.score

  return (
    <section
      aria-labelledby="last-result-heading"
      className="rounded-2xl border border-line bg-sheet p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id="last-result-heading"
          className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
        >
          Dernier résultat
        </h2>
        <time dateTime={match.playedAt.toISOString()} className="text-xs text-ink-soft">
          {formatFullDate(match.playedAt)}
        </time>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {match.homeTeam.name}
        </p>
        <p className="shrink-0 text-lg font-bold tabular-nums text-ink">
          {formatScore(match.homeScore ?? 0, match.awayScore ?? 0)}
        </p>
        <p className="min-w-0 flex-1 truncate text-right text-sm font-medium text-ink">
          {match.awayTeam.name}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/30 pt-3 text-sm">
        {prediction ? (
          <span className="text-ink-soft">
            Votre pronostic :{' '}
            <span className="font-semibold tabular-nums text-ink">
              {formatScore(prediction.homeScore, prediction.awayScore)}
            </span>
          </span>
        ) : (
          <span className="text-ink-soft">Vous n’aviez pas pronostiqué</span>
        )}

        {score && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              score.points > 0 ? 'bg-win/15 text-ink' : 'bg-loss/10 text-ink-soft'
            }`}
          >
            <span aria-hidden>{RULE_ICONS[score.ruleApplied as ScoringRule]} </span>
            +{score.points} pts · {explainRule(score.ruleApplied as ScoringRule)}
          </span>
        )}
      </div>
    </section>
  )
}
