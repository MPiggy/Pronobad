'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Modal } from '@/components/modal'
import { useToast } from '@/components/toast'
import { ScorePairInput } from '@/components/score-pair-input'
import {
  IconButton,
  StateMessage,
  SubmitButton,
  useFormAction,
} from '@/components/form-controls'
import type { SavedFormState } from '@/lib/form-state'
import {
  formatMatchDateTime,
  formatScore,
  toParisDateTimeLocal,
} from '@/lib/format'
import { deleteMatch, enterResult, withdrawResult } from './actions'
import { FixtureForm, type TeamOption } from './fixture-form'

/**
 * One fixture on the admin page, with the two things an admin does to it.
 *
 * Two actions, not six: a result button, and a pencil that opens the fixture's
 * single edit form. Everything that used to be its own form with its own save
 * button — date, deadline, format — is a field in that one form; deleting is
 * an icon beside its save button, behind a confirmation, where it cannot be
 * hit by accident from the list.
 */

export type FixtureStatus = 'awaiting' | 'upcoming' | 'finished'

export type AdminFixture = {
  id: string
  round: number
  playedAt: Date
  locksAt: Date
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  /** The fixture's own rubber count, or null when it follows the default. */
  maxScore: number | null
  predictionCount: number
  /** Decided by the server against its own clock, so the card never disagrees with it. */
  status: FixtureStatus
}

function StatusPill({ fixture }: { fixture: AdminFixture }) {
  if (fixture.homeScore !== null && fixture.awayScore !== null) {
    return (
      <span className="shrink-0 rounded-full bg-win/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-ink">
        {formatScore(fixture.homeScore, fixture.awayScore)}
      </span>
    )
  }

  if (fixture.status === 'awaiting') {
    return (
      <span className="shrink-0 rounded-full bg-pending/15 px-2.5 py-1 text-xs font-semibold text-ink">
        Résultat attendu
      </span>
    )
  }

  return (
    <span className="shrink-0 rounded-full bg-court-light px-2.5 py-1 text-xs font-semibold text-court-dark">
      À venir
    </span>
  )
}

function ResultForm({
  fixture,
  maxScore,
  onSaved,
}: {
  fixture: AdminFixture
  maxScore: number
  onSaved: (state: SavedFormState) => void
}) {
  const [state, formAction] = useFormAction(enterResult, onSaved)

  const hasResult = fixture.homeScore !== null

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="matchId" value={fixture.id} />

      <ScorePairInput
        idPrefix={`result-${fixture.id}`}
        homeName="homeScore"
        awayName="awayScore"
        homeLabel={fixture.homeTeamName}
        awayLabel={fixture.awayTeamName}
        maxScore={maxScore}
        defaultHome={fixture.homeScore}
        defaultAway={fixture.awayScore}
        size="lg"
      />

      <p className="text-center text-xs text-ink-soft">
        {maxScore} match{maxScore > 1 ? 's' : ''} — les deux scores totalisent{' '}
        {maxScore}.
      </p>

      <StateMessage state={state} />

      <SubmitButton>
        {hasResult ? 'Corriger le résultat' : 'Enregistrer le résultat'}
      </SubmitButton>
    </form>
  )
}

function WithdrawForm({
  matchId,
  predictionCount,
  onSaved,
}: {
  matchId: string
  predictionCount: number
  onSaved: (state: SavedFormState) => void
}) {
  const [state, formAction] = useFormAction(withdrawResult, onSaved)

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (
          !confirm(
            predictionCount === 0
              ? 'Retirer le résultat ? La rencontre repassera « à venir ».'
              : `Retirer le résultat ? Les points attribués aux ${predictionCount} pronostic${predictionCount > 1 ? 's' : ''} seront retirés du classement.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="matchId" value={matchId} />
      <StateMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="Retrait…">
        Retirer le résultat
      </SubmitButton>
    </form>
  )
}

export function FixtureCard({
  fixture,
  teams,
  defaultMaxScore,
}: {
  fixture: AdminFixture
  teams: TeamOption[]
  /** The competition default rubber count, for fixtures without an override. */
  defaultMaxScore: number
}) {
  const [dialog, setDialog] = useState<'result' | 'edit' | null>(null)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  const hasResult = fixture.homeScore !== null && fixture.awayScore !== null
  const maxScore = fixture.maxScore ?? defaultMaxScore
  const label = `${fixture.homeTeamName} — ${fixture.awayTeamName}`
  const deadlineAtKickoff =
    fixture.locksAt.getTime() === fixture.playedAt.getTime()

  // A save that carries a warning keeps the modal open so the warning can be
  // read; a plain success is toasted and the modal goes away on its own.
  const handleSaved = (state: SavedFormState) => {
    showToast(state.message)
    if (!state.warning) setCloseRequest((count) => count + 1)
  }

  // Owned here rather than by the edit form: a successful delete removes this
  // card, and the toast has to come from something that knew it happened.
  const [deleteState, deleteAction] = useFormAction(deleteMatch, handleSaved)

  // The confirmation names what is actually at stake — how many predictions,
  // and whether points are already on the leaderboard — because "Supprimer
  // cette rencontre ?" gives an admin nothing to weigh.
  const { predictionCount } = fixture
  const consequence =
    predictionCount === 0
      ? 'Aucun pronostic n’a été enregistré dessus.'
      : `Ses ${predictionCount} pronostic${predictionCount > 1 ? 's' : ''}${
          hasResult ? ' et les points déjà attribués au classement' : ''
        } seront aussi supprimé${predictionCount > 1 ? 's' : ''}.`

  const resultButtonClass =
    fixture.status === 'awaiting'
      ? 'min-h-11 flex-1 rounded-xl bg-court px-4 text-sm font-semibold text-ink transition-opacity active:opacity-90'
      : 'min-h-11 flex-1 rounded-xl border border-line bg-sheet px-4 text-sm font-medium text-ink-soft transition-colors active:bg-shuttle/5'

  return (
    <li className="rounded-2xl border border-line bg-sheet p-4">
      <div className="flex items-center justify-between gap-3">
        <time
          dateTime={fixture.playedAt.toISOString()}
          className="text-xs font-medium text-ink-soft"
        >
          J{fixture.round} · {formatMatchDateTime(fixture.playedAt)}
        </time>
        <StatusPill fixture={fixture} />
      </div>

      <p className="mt-2 text-sm font-medium text-ink">{label}</p>

      <p className="mt-1 text-xs text-ink-soft">
        {fixture.predictionCount} pronostic{fixture.predictionCount > 1 ? 's' : ''}
        {' · '}
        {maxScore} match{maxScore > 1 ? 's' : ''}
        {!deadlineAtKickoff && (
          <> · ferme {formatMatchDateTime(fixture.locksAt)}</>
        )}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDialog('result')}
          className={resultButtonClass}
        >
          {hasResult ? 'Corriger le résultat' : 'Saisir le résultat'}
        </button>

        <IconButton label="Modifier la rencontre" onClick={() => setDialog('edit')}>
          <Pencil aria-hidden className="size-5" />
        </IconButton>
      </div>

      {dialog === 'result' && (
        <Modal
          // The score inputs are labelled with the team names already.
          title={hasResult ? 'Corriger le résultat' : 'Résultat'}
          onClose={() => setDialog(null)}
          requestClose={closeRequest}
        >
          <div className="space-y-5">
            <p className="-mt-2 text-xs text-ink-soft">
              J{fixture.round} · {formatMatchDateTime(fixture.playedAt)}
            </p>

            <ResultForm fixture={fixture} maxScore={maxScore} onSaved={handleSaved} />

            {hasResult && (
              <WithdrawForm
                matchId={fixture.id}
                predictionCount={fixture.predictionCount}
                onSaved={handleSaved}
              />
            )}
          </div>
        </Modal>
      )}

      {dialog === 'edit' && (
        <Modal
          title="Modifier la rencontre"
          onClose={() => setDialog(null)}
          requestClose={closeRequest}
        >
          <FixtureForm
            matchId={fixture.id}
            values={{
              homeTeamId: fixture.homeTeamId,
              awayTeamId: fixture.awayTeamId,
              round: fixture.round,
              playedAtLocal: toParisDateTimeLocal(fixture.playedAt),
              locksAtLocal: toParisDateTimeLocal(fixture.locksAt),
              maxScore: fixture.maxScore,
            }}
            teams={teams}
            defaultMaxScore={defaultMaxScore}
            onSaved={handleSaved}
            remove={{
              action: deleteAction,
              state: deleteState,
              label: 'Supprimer la rencontre',
              confirmMessage: `Supprimer « ${label} » ? ${consequence} Cette action est irréversible.`,
            }}
          />
        </Modal>
      )}
    </li>
  )
}
