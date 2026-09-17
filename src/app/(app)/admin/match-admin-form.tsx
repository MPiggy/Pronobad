'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { ScorePairInput } from '@/components/score-pair-input'
import {
  MAX_MAX_SCORE,
  MIN_MAX_SCORE,
} from '@/lib/predictions/score-field'
import {
  deleteMatch,
  enterResult,
  updateLocksAt,
  updateMatchDate,
  updateMatchMaxScore,
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

      <ScorePairInput
        idPrefix={`result-${matchId}`}
        homeName="homeScore"
        awayName="awayScore"
        homeLabel={homeTeamName}
        awayLabel={awayTeamName}
        maxScore={maxScore}
        defaultHome={homeScore}
        defaultAway={awayScore}
      />

      <p className="text-xs text-ink-soft">
        {maxScore} match{maxScore > 1 ? 's' : ''} — les deux scores totalisent{' '}
        {maxScore}.
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
 * How many rubbers this fixture is played over, when it differs from the
 * competition default.
 *
 * Empty means "follow the default" rather than zero — the placeholder shows
 * what that default currently is, so an admin can see what they are inheriting
 * without leaving the page.
 */
function MaxScoreForm({
  matchId,
  maxScore,
  defaultMaxScore,
}: {
  matchId: string
  maxScore: number | null
  defaultMaxScore: number
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    updateMatchMaxScore,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />

      <div>
        <label
          htmlFor={`${matchId}-maxScore`}
          className="mb-1.5 block text-xs font-medium text-ink-soft"
        >
          Nombre de matchs joués
        </label>
        <input
          id={`${matchId}-maxScore`}
          name="maxScore"
          type="number"
          inputMode="numeric"
          min={MIN_MAX_SCORE}
          max={MAX_MAX_SCORE}
          defaultValue={maxScore ?? ''}
          placeholder={`${defaultMaxScore} (défaut)`}
          className="num w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Détermine les pronostics possibles : les deux scores doivent totaliser
        ce nombre. Laissez vide pour suivre le réglage général.
      </p>

      <StateMessage state={state} />

      <SubmitButton variant="secondary">Modifier le format</SubmitButton>
    </form>
  )
}

/**
 * Deleting a fixture, and with it every prediction and every point earned on
 * it.
 *
 * An icon button, not a full-width one: it sits at the end of a panel of
 * labelled actions, and a red bar the same size as "Enregistrer le résultat"
 * reads as an equal peer of them rather than the exceptional, irreversible
 * one. The confirmation carries the words instead, and names what is actually
 * at stake — how many predictions, and whether points are already on the
 * leaderboard — because "Supprimer cette rencontre ?" gives an admin nothing
 * to weigh.
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
      <div className="flex justify-end">
        <button
          type="submit"
          aria-label="Supprimer la rencontre"
          title="Supprimer la rencontre"
          className="flex size-11 items-center justify-center rounded-xl border border-loss/40 bg-transparent text-loss transition-colors hover:bg-loss/10"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>
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
  matchMaxScore,
  defaultMaxScore,
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
  /** This fixture's rubber count in force — its override, else the default. */
  maxScore: number
  /** The fixture's own override, or null when it follows the default. */
  matchMaxScore: number | null
  /** The competition default, shown as the override field's placeholder. */
  defaultMaxScore: number
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

        <MaxScoreForm
          matchId={matchId}
          maxScore={matchMaxScore}
          defaultMaxScore={defaultMaxScore}
        />

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
