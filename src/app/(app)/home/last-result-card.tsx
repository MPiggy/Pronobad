import type { MatchCardData } from '@/components/match-card'
import { TeamLogo } from '@/components/team-logo'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import type { TeamDisplay } from '@/lib/teams/logo'
import { formatFullDate, formatPoints, formatScore } from '@/lib/format'

/** One team on either side of the scoreboard; the loser is dimmed. */
function Side({ team, lost }: { team: TeamDisplay; lost: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-1.5 text-center ${
        lost ? 'opacity-55' : ''
      }`}
    >
      <TeamLogo team={team} size="md" />
      <p className="max-w-full text-sm leading-tight font-semibold text-balance break-words text-shuttle-text">
        {team.name}
      </p>
    </div>
  )
}

/**
 * How the member did on the latest result — the moment a prediction pays off,
 * which otherwise only surfaces inside a past fixture's modal.
 *
 * Drawn as a face-off on the dark court, in the same language as the next
 * match hero above it: home team, the final score as a scoreboard, away team.
 * Below the line, the member's own prediction and what it earned.
 */
export function LastResultCard({ match }: { match: MatchCardData }) {
  const { prediction } = match
  const score = prediction?.score
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0

  return (
    <section
      aria-labelledby="last-result-heading"
      className="rounded-2xl border border-court/15 bg-gradient-to-b from-shuttle-text/[0.07] to-shuttle-text/[0.03] px-3.5 pt-3.5 pb-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="last-result-heading"
          className="text-xs font-semibold uppercase tracking-wide text-shuttle-text-soft"
        >
          Dernier résultat
        </h2>
        <time
          dateTime={match.playedAt.toISOString()}
          className="text-xs text-shuttle-text-soft"
        >
          {formatFullDate(match.playedAt)}
        </time>
      </div>

      <div className="my-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <Side team={match.homeTeam} lost={homeScore < awayScore} />

        <div className="flex min-w-21 flex-col items-center gap-1">
          <p className="rounded-xl bg-black/20 px-3 py-2 text-[1.625rem] leading-none font-extrabold tabular-nums text-shuttle-text">
            {homeScore}–{awayScore}
          </p>
          <p className="text-[0.625rem] uppercase tracking-wide text-shuttle-text-soft">
            Score final
          </p>
        </div>

        <Side team={match.awayTeam} lost={awayScore < homeScore} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-shuttle-text/10 pt-2.5 text-xs text-shuttle-text-soft">
        {prediction ? (
          <span>
            Prono{' '}
            <span className="font-semibold tabular-nums text-shuttle-text">
              {formatScore(prediction.homeScore, prediction.awayScore)}
            </span>
            {score && <> · {explainRule(score.ruleApplied as ScoringRule)}</>}
          </span>
        ) : (
          <span>Vous n’aviez pas pronostiqué</span>
        )}

        {score && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-extrabold ${
              score.points > 0
                ? 'bg-win/25 text-win-light'
                : 'bg-shuttle-text/10 text-shuttle-text-soft'
            }`}
          >
            {score.points > 0 ? '+' : ''}
            {formatPoints(score.points)}
          </span>
        )}
      </div>
    </section>
  )
}
