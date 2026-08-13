'use client'

import { useActionState } from 'react'
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
      className="w-full rounded-md bg-court px-4 py-3 text-sm font-semibold tracking-wide text-white transition-opacity active:opacity-90 disabled:opacity-60"
    >
      {pending
        ? 'Enregistrement…'
        : hasPrediction
          ? 'Modifier le pronostic'
          : 'Valider le pronostic'}
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
        className="mb-1.5 block truncate text-xs font-medium text-ink-soft"
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
        className="num w-full rounded-md border border-line bg-shuttle px-3 py-2.5 text-center text-3xl font-semibold text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-court focus-visible:bg-sheet"
      />
    </div>
  )
}

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  prediction,
}: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  prediction: { homeScore: number; awayScore: number } | null
}) {
  const [state, formAction] = useActionState<PredictionState, FormData>(
    submitPrediction,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="flex items-end gap-2.5">
        <ScoreInput
          name="homeScore"
          label={homeTeamName}
          defaultValue={prediction?.homeScore}
        />
        <span aria-hidden className="pb-3 text-lg text-ink-faint">
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

      <p className="text-center text-xs text-ink-faint">
        Modifiable jusqu’à la fermeture des pronostics.
      </p>
    </form>
  )
}
