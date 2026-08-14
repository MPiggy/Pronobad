'use client'

import { useState } from 'react'
import { Modal } from '@/components/modal'
import { MatchCard, type MatchCardData } from '@/components/match-card'
import { explainLock, lockState } from '@/lib/predictions/locking'
import { explainRule, type ScoringRule } from '@/lib/scoring/rules'
import { formatPoints } from '@/lib/format'
import { PredictionForm } from './[matchId]/prediction-form'

/**
 * A fixture card that opens the score entry as a modal instead of navigating
 * to the fixture's own page — betting on a match is a two-tap action
 * (open, type the score), not a page visit.
 */
export function MatchModalTrigger({ match, now }: { match: MatchCardData; now: Date }) {
  const [open, setOpen] = useState(false)
  const state = lockState(match, now)
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const { prediction } = match

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full active:opacity-90">
        <MatchCard match={match} now={now} />
      </button>

      {open && (
        <Modal
          title={`${match.homeTeam.name} – ${match.awayTeam.name}`}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            {hasResult && (
              <p className="text-center text-2xl font-bold tabular-nums text-ink">
                {match.homeScore} - {match.awayScore}
              </p>
            )}

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
              />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
