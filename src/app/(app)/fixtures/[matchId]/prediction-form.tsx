'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { submitPrediction, type PredictionState } from './actions'

/**
 * Score entry for one fixture.
 *
 * Two number inputs rather than a stepper or a slider: a member knows the
 * score they want ("5-3") and typing it is two taps, where stepping to it is
 * eight. `inputMode="numeric"` brings up the digit keypad on a phone.
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

function ScoreInput({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue?: number
}) {
  return (
    <div className="flex-1">
      <label
        htmlFor={name}
        className="mb-2 block truncate text-xs font-medium text-ink-soft"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        required
        min={0}
        max={20}
        defaultValue={defaultValue}
        placeholder="0"
        className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-center text-2xl font-bold tabular-nums text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
      />
    </div>
  )
}

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  prediction,
  onSaved,
}: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  prediction: { homeScore: number; awayScore: number } | null
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

      <div className="flex items-end gap-3">
        <ScoreInput
          name="homeScore"
          label={homeTeamName}
          defaultValue={prediction?.homeScore}
        />
        <span aria-hidden className="pb-3 text-lg font-bold text-ink-soft">
          –
        </span>
        <ScoreInput
          name="awayScore"
          label={awayTeamName}
          defaultValue={prediction?.awayScore}
        />
      </div>

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
