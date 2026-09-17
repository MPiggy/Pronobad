'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  deleteMatch,
  enterResult,
  updateLocksAt,
  updateMatchDate,
  withdrawResult,
  type AdminState,
} from './actions'

/**
 * Result entry, rescheduling and deadline editing for one fixture.
 *
 * Every form lives behind a `<details>` so a season of fixtures stays scannable
 * — an admin opens the one they came for rather than scrolling past twenty
 * expanded forms.
 */

function StateMessage({ state }: { state: AdminState }) {
  if (state.status === 'error') {
    return (
      <p role="alert" className="text-sm text-loss">
        {state.message}
      </p>
    )
  }

  if (state.status === 'saved') {
    return (
      <p role="status" className="text-sm font-medium text-court-dark">
        {state.message}
      </p>
    )
  }

  return null
}

function SubmitButton({
  children,
  variant = 'primary',
}: {
  children: string
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === 'primary'
          ? 'w-full rounded-xl bg-court px-4 py-3 text-sm font-semibold text-ink transition-opacity disabled:opacity-60'
          : 'w-full rounded-xl border border-line bg-sheet px-4 py-3 text-sm font-medium text-ink-soft transition-opacity disabled:opacity-60'
      }
    >
      {pending ? 'Enregistrement…' : children}
    </button>
  )
}

function ResultForm({
  matchId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  maxScore,
}: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  maxScore: number
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(enterResult, {
    status: 'idle',
  })

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="flex items-end gap-3">
        {[
          { name: 'homeScore', label: homeTeamName, value: homeScore },
          { name: 'awayScore', label: awayTeamName, value: awayScore },
        ].map((field) => (
          <div key={field.name} className="flex-1">
            <label
              htmlFor={`${matchId}-${field.name}`}
              className="mb-1.5 block truncate text-xs font-medium text-ink-soft"
            >
              {field.label}
            </label>
            <input
              id={`${matchId}-${field.name}`}
              name={field.name}
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={maxScore}
              defaultValue={field.value ?? undefined}
              className="w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-center text-xl font-bold tabular-nums text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-soft">
        Maximum {maxScore} point{maxScore > 1 ? 's' : ''} par équipe — modifiable
        dans Structure.
      </p>

      <StateMessage state={state} />

      <SubmitButton>
        {homeScore === null ? 'Enregistrer le résultat' : 'Corriger le résultat'}
      </SubmitButton>
    </form>
  )
}

function WithdrawForm({ matchId }: { matchId: string }) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    withdrawResult,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="matchId" value={matchId} />
      <StateMessage state={state} />
      <SubmitButton variant="secondary">Retirer le résultat</SubmitButton>
    </form>
  )
}

/**
 * Deleting a fixture, and with it every prediction and every point earned on
 * it.
 *
 * The confirmation names what is actually at stake — how many predictions, and
 * whether points are already on the leaderboard — because "Supprimer cette
 * rencontre ?" gives an admin nothing to weigh, and this is not undoable.
 */
function DeleteMatchForm({
  matchId,
  label,
  predictionCount,
  hasResult,
}: {
  matchId: string
  label: string
  predictionCount: number
  hasResult: boolean
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    deleteMatch,
    { status: 'idle' },
  )

  const consequence =
    predictionCount === 0
      ? 'Aucun pronostic n’a été enregistré dessus.'
      : `Ses ${predictionCount} pronostic${predictionCount > 1 ? 's' : ''}${
          hasResult ? ' et les points déjà attribués au classement' : ''
        } seront aussi supprimé${predictionCount > 1 ? 's' : ''}.`

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (
          !confirm(
            `Supprimer « ${label} » ? ${consequence} Cette action est irréversible.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="matchId" value={matchId} />
      <StateMessage state={state} />
      <button
        type="submit"
        className="w-full rounded-xl border border-loss/40 bg-transparent px-4 py-3 text-sm font-semibold text-loss transition-colors hover:bg-loss/10"
      >
        Supprimer la rencontre
      </button>
    </form>
  )
}

function DateForm({
  matchId,
  defaultValue,
}: {
  matchId: string
  defaultValue: string
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    updateMatchDate,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div>
        <label
          htmlFor={`${matchId}-playedAt`}
          className="mb-1.5 block text-xs font-medium text-ink-soft"
        >
          Date de la rencontre (heure de Paris)
        </label>
        <input
          id={`${matchId}-playedAt`}
          name="playedAt"
          type="datetime-local"
          required
          defaultValue={defaultValue}
          className="w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      <p className="text-xs text-ink-soft">
        La fermeture des pronostics suit la nouvelle date. Ajustez-la ci-dessous
        si besoin.
      </p>

      <StateMessage state={state} />

      <SubmitButton variant="secondary">Reprogrammer</SubmitButton>
    </form>
  )
}

function LocksAtForm({
  matchId,
  defaultValue,
}: {
  matchId: string
  defaultValue: string
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    updateLocksAt,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div>
        <label
          htmlFor={`${matchId}-locksAt`}
          className="mb-1.5 block text-xs font-medium text-ink-soft"
        >
          Fermeture des pronostics (heure de Paris)
        </label>
        <input
          id={`${matchId}-locksAt`}
          name="locksAt"
          type="datetime-local"
          required
          defaultValue={defaultValue}
          className="w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      <StateMessage state={state} />

      <SubmitButton variant="secondary">Modifier la fermeture</SubmitButton>
    </form>
  )
}

export function MatchAdminForm({
  matchId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  playedAtLocal,
  locksAtLocal,
  maxScore,
  predictionCount,
}: {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  /** `playedAt` pre-formatted as a Paris `datetime-local` value by the server. */
  playedAtLocal: string
  /** `locksAt` pre-formatted as a Paris `datetime-local` value by the server. */
  locksAtLocal: string
  /** The admin-set score cap, bounding the result inputs. */
  maxScore: number
  /** How many predictions deletion would take with it, for the confirmation. */
  predictionCount: number
}) {
  const hasResult = homeScore !== null && awayScore !== null

  return (
    <details className="group mt-3 border-t border-line pt-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-court-dark marker:content-none">
        <span className="group-open:hidden">Gérer cette rencontre</span>
        <span className="hidden group-open:inline">Fermer</span>
      </summary>

      <div className="mt-4 space-y-5">
        <ResultForm
          matchId={matchId}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeScore={homeScore}
          awayScore={awayScore}
          maxScore={maxScore}
        />

        {hasResult && <WithdrawForm matchId={matchId} />}

        <DateForm matchId={matchId} defaultValue={playedAtLocal} />

        <LocksAtForm matchId={matchId} defaultValue={locksAtLocal} />

        <div className="border-t border-line pt-5">
          <DeleteMatchForm
            matchId={matchId}
            label={`${homeTeamName} — ${awayTeamName}`}
            predictionCount={predictionCount}
            hasResult={hasResult}
          />
        </div>
      </div>
    </details>
  )
}
