'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { ScorePairInput } from '@/components/score-pair-input'
import { submitPrediction, type PredictionState } from './actions'

/**
 * Score entry for one fixture.
 *
 * Two number inputs rather than a stepper or a slider: a member knows the
 * score they want ("5-3") and typing it is two taps, where stepping to it is
 * eight. `inputMode="numeric"` brings up the digit keypad on a phone.
 *
 * The two are linked — see `ScorePairInput`. A fixture of N rubbers produces N
 * winners, so naming one side already names the other.
 */

function SubmitButton({ hasPrediction }: { hasPrediction: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending
        ? 'Enregistrement…'
        : hasPrediction
          ? 'Modifier mon pronostic'
          : 'Valider mon pronostic'}
    </button>
  )
}

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  prediction,
  maxScore,
  onSaved,
}: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  prediction: { homeScore: number; awayScore: number } | null
  /**
   * The fixture's rubber count — its own override, or the competition default.
   * Bounds the inputs and sets the total they must add up to. The action
   * resolves it again server-side and is what actually enforces it.
   */
  maxScore: number
  /** Called once, right after a submission lands as `saved`. */
  onSaved?: () => void
}) {
  const [state, formAction] = useActionState<PredictionState, FormData>(
    submitPrediction,
    { status: 'idle' },
  )

  useEffect(() => {
    if (state.status === 'saved') onSaved?.()
    // Only the transition into "saved" should fire this, not `onSaved` identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="matchId" value={matchId} />

      <ScorePairInput
        idPrefix={`prediction-${matchId}`}
        homeName="homeScore"
        awayName="awayScore"
        homeLabel={homeTeamName}
        awayLabel={awayTeamName}
        maxScore={maxScore}
        defaultHome={prediction?.homeScore}
        defaultAway={prediction?.awayScore}
        size="lg"
      />

      <p className="text-center text-xs text-ink-soft">
        {maxScore} match{maxScore > 1 ? 's' : ''} — les deux scores totalisent{' '}
        {maxScore}.
      </p>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      {state.status === 'saved' && (
        <p role="status" className="text-sm font-medium text-court-dark">
          Pronostic enregistré.
        </p>
      )}

      <SubmitButton hasPrediction={prediction !== null} />

      <p className="text-center text-xs leading-relaxed text-ink-soft">
        Modifiable jusqu’à la fermeture des pronostics.
      </p>
    </form>
  )
}
