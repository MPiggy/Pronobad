'use client'

import { Fragment, useState } from 'react'
import { Clock } from 'lucide-react'
import { Modal } from '@/components/modal'
import { TeamLogo } from '@/components/team-logo'
import { useToast } from '@/components/toast'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import {
  formatMatchCountdown,
  formatMatchDateTime,
  formatPoints,
} from '@/lib/format'
import { PredictionForm } from '../fixtures/[matchId]/prediction-form'
import type { MatchCardData } from '@/components/match-card'

/**
 * The home tab's whole reason to exist: the next fixture, big, with a
 * countdown and a one-tap path to predicting it — everything else on the
 * app is reachable from the bottom nav, so this screen doesn't need to be
 * a list too.
 */
export function NextMatchHero({
  match,
  now,
  maxScore,
}: {
  match: MatchCardData
  now: Date
  /** The admin-set score cap, read once by the page and passed down. */
  maxScore: number
}) {
  const [open, setOpen] = useState(false)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  const state = lockState(match, now)
  const { prediction } = match

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-3xl border border-court/40 bg-gradient-to-b from-shuttle to-shuttle/80 p-6 text-left shadow-lg shadow-court/10 active:opacity-95"
      >
        <p className="text-xs font-semibold tracking-wide text-court">
          PROCHAINE RENCONTRE
        </p>

        <div className="mt-4 flex items-start justify-between gap-3">
          {[match.homeTeam, match.awayTeam].map((team, index) => (
            <Fragment key={team.id}>
              {index === 1 && (
                // Level with the middle of the logos above the names.
                <span className="mt-4 shrink-0 text-sm font-semibold text-shuttle-text-soft">
                  VS
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <TeamLogo team={team} size="lg" />
                <p className="max-w-full text-lg font-bold text-balance break-words text-shuttle-text">
                  {team.name}
                </p>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="my-6 flex items-center justify-center">
          <span className="flex size-24 items-center justify-center rounded-full border-4 border-court text-2xl font-extrabold text-court">
            {formatMatchCountdown(match.playedAt, now)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-sm text-shuttle-text-soft">
          <Clock aria-hidden className="size-4" />
          <time dateTime={match.playedAt.toISOString()}>
            {formatMatchDateTime(match.playedAt)}
          </time>
        </div>

        <div className="mt-5 text-center">
          {prediction ? (
            <p className="text-sm font-medium text-court">
              ✓ Pronostic enregistré : {prediction.homeScore} - {prediction.awayScore}
            </p>
          ) : state.locked ? (
            <p className="text-sm text-shuttle-text-soft">Pronostics fermés</p>
          ) : (
            <p className="text-sm font-semibold text-court">Pronostiquer →</p>
          )}
        </div>
      </button>

      {open && (
        <Modal
          // With the form open, its labels already name both teams; repeating
          // them as a title crowds long names. Closed, there are no labels, so
          // the title is what says which fixture this is.
          title={
            state.locked
              ? `${match.homeTeam.name} – ${match.awayTeam.name}`
              : 'Votre pronostic'
          }
          onClose={() => setOpen(false)}
          requestClose={closeRequest}
        >
          <div className="space-y-4">
            {prediction?.score && (
              <p className="text-center text-sm text-ink-soft">
                {explainRule(prediction.score.ruleApplied as ScoringRule)} —{' '}
                <span className="font-semibold text-ink">
                  {formatPoints(prediction.score.points)}
                </span>
              </p>
            )}

            {state.locked ? (
              <p className="rounded-xl border border-line bg-shuttle/5 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                {explainLock(state)}
                {!prediction && ' Vous n’aviez pas pronostiqué cette rencontre.'}
              </p>
            ) : (
              <PredictionForm
                matchId={match.id}
                homeTeamName={match.homeTeam.name}
                awayTeamName={match.awayTeam.name}
                prediction={prediction}
                maxScore={maxScore}
                onSaved={() => {
                  showToast('Pronostic enregistré')
                  setCloseRequest((count) => count + 1)
                }}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
