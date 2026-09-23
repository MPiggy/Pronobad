import { Clock } from 'lucide-react'
import { TeamLogo } from '@/components/team-logo'
import { lockState } from '@/lib/predictions/locking'
import { CLOSING_SOON_WINDOW_MS } from '@/lib/predictions/home'
import type { TeamDisplay } from '@/lib/teams/logo'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import {
  formatDateBlock,
  formatScore,
  formatTime,
  formatTimeRemaining,
} from '@/lib/format'

/**
 * One fixture in a list, drawn as a bet slip: date, teams, and a tear-off
 * stub holding the one number that matters.
 *
 * The card's whole job is answering "do I need to do something about this
 * one?" at a glance, so the stub is the loudest element rather than the team
 * names — gold while a prediction is still missing, the member's own score
 * once saved, the points once the result is in. A member scrolling on a phone
 * is scanning for gold.
 *
 * Purely presentational: the caller decides what a tap does (navigate, open a
 * modal, …), so this renders its content only — no wrapping link or button.
 */

export type MatchCardData = {
  id: string
  playedAt: Date
  locksAt: Date
  resultEnteredAt: Date | null
  homeScore: number | null
  awayScore: number | null
  homeTeam: TeamDisplay
  awayTeam: TeamDisplay
  prediction: {
    homeScore: number
    awayScore: number
    score: { points: number; ruleApplied: string } | null
  } | null
}

/** Small uppercase caption above or below the stub's number. */
function StubCaption({ children }: { children: string }) {
  return (
    <span className="text-[0.625rem] font-bold uppercase tracking-wide opacity-75">
      {children}
    </span>
  )
}

function StubNumber({ children }: { children: string }) {
  return (
    <span className="text-2xl leading-tight font-extrabold tracking-tight tabular-nums">
      {children}
    </span>
  )
}

export function MatchCard({ match, now }: { match: MatchCardData; now: Date }) {
  const state = lockState(match, now)
  const { prediction } = match
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const date = formatDateBlock(match.playedAt)
  // Same window as the "closing soon" banner on the fixtures tab, so the two
  // never disagree about which fixtures are urgent.
  const urgent =
    !state.locked && !prediction && state.msRemaining < CLOSING_SOON_WINDOW_MS

  const rows = [
    { team: match.homeTeam, score: match.homeScore, other: match.awayScore },
    { team: match.awayTeam, score: match.awayScore, other: match.homeScore },
  ]

  const stub = !state.locked
    ? prediction
      ? {
          tone: 'bg-court-light text-court-dark',
          content: (
            <>
              <StubCaption>Votre prono</StubCaption>
              <StubNumber>{`${prediction.homeScore}–${prediction.awayScore}`}</StubNumber>
              <StubCaption>Modifier</StubCaption>
            </>
          ),
        }
      : {
          tone: 'bg-court text-ink',
          content: (
            <>
              <span aria-hidden className="text-xl leading-tight font-extrabold">? – ?</span>
              <StubCaption>Pronostiquer</StubCaption>
            </>
          ),
        }
    : hasResult && prediction?.score
      ? {
          tone:
            prediction.score.points > 0
              ? 'bg-win/20 text-win-dark'
              : 'bg-loss/10 text-ink-soft',
          content: (
            <>
              <StubNumber>
                {prediction.score.points > 0
                  ? `+${prediction.score.points}`
                  : String(prediction.score.points)}
              </StubNumber>
              <StubCaption>{prediction.score.points > 1 ? 'points' : 'point'}</StubCaption>
            </>
          ),
        }
      : {
          // Closed, awaiting the result — or finished without a prediction.
          tone: 'bg-line/15 text-ink-soft',
          content: prediction ? (
            <>
              <StubCaption>Votre prono</StubCaption>
              <StubNumber>{`${prediction.homeScore}–${prediction.awayScore}`}</StubNumber>
              <StubCaption>En attente</StubCaption>
            </>
          ) : (
            <>
              <StubNumber>—</StubNumber>
              <StubCaption>Aucun prono</StubCaption>
            </>
          ),
        }

  return (
    <div className="flex text-left text-ink drop-shadow-[0_6px_14px_rgb(0_0_0/0.25)]">
      <div className="ticket-main flex min-w-0 flex-1 items-center gap-3 rounded-l-2xl bg-sheet p-3">
        <time
          dateTime={match.playedAt.toISOString()}
          className={`flex w-11 shrink-0 flex-col items-center rounded-[10px] py-1.5 leading-none ${
            state.locked ? 'bg-line/10' : 'bg-court-light'
          }`}
        >
          <span
            className={`text-[0.625rem] font-bold uppercase tracking-wide ${
              state.locked ? 'text-ink-soft' : 'text-court-dark'
            }`}
          >
            {date.weekday}
          </span>
          <span className="my-[3px] text-xl font-extrabold tabular-nums">{date.day}</span>
          <span
            className={`text-[0.625rem] font-bold uppercase tracking-wide ${
              state.locked ? 'text-ink-soft' : 'text-court-dark'
            }`}
          >
            {date.month}
          </span>
        </time>

        <div className="min-w-0 flex-1">
          <div className="space-y-1.5">
            {rows.map(({ team, score, other }) => {
              const lost = hasResult && (score ?? 0) < (other ?? 0)
              return (
                <div key={team.id} className="flex items-center gap-2.5">
                  <TeamLogo team={team} />
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${
                      lost ? 'font-medium text-ink-soft' : 'font-semibold text-ink'
                    }`}
                  >
                    {team.name}
                  </p>
                  {hasResult && (
                    <p
                      className={`shrink-0 text-base tabular-nums ${
                        lost ? 'font-medium text-ink-soft' : 'font-extrabold text-ink'
                      }`}
                    >
                      {score}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-1 text-xs text-ink-soft">
            <span className="tabular-nums">{formatTime(match.playedAt)}</span>
            <span aria-hidden>·</span>
            {!state.locked ? (
              <span
                className={`flex items-center gap-1 font-semibold ${
                  urgent ? 'text-loss' : 'text-court-dark'
                }`}
              >
                <Clock aria-hidden className="size-3.5" />
                {formatTimeRemaining(state.msRemaining)}
              </span>
            ) : prediction && hasResult ? (
              <span>
                Prono{' '}
                <span className="font-semibold tabular-nums text-ink">
                  {formatScore(prediction.homeScore, prediction.awayScore)}
                </span>
                {prediction.score && (
                  <> · {explainRule(prediction.score.ruleApplied as ScoringRule)}</>
                )}
              </span>
            ) : (
              <span>{hasResult ? 'Aucun pronostic' : 'Pronostics fermés'}</span>
            )}
          </p>
        </div>
      </div>

      <div
        className={`ticket-stub relative flex w-21 shrink-0 flex-col items-center justify-center gap-0.5 rounded-r-2xl px-1.5 py-2.5 text-center before:absolute before:inset-y-3.5 before:left-0 before:border-l-2 before:border-dashed before:border-ink/20 before:content-[''] ${stub.tone}`}
      >
        {stub.content}
      </div>
    </div>
  )
}
