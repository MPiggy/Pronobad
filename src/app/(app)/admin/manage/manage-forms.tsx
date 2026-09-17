'use client'

import { useState, type ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Modal } from '@/components/modal'
import { useToast } from '@/components/toast'
import {
  Field,
  IconButton,
  inputClass,
  SaveBar,
  StateMessage,
  SubmitButton,
  useFormAction,
  type DeleteConfig,
} from '@/components/form-controls'
import type { SavedFormState } from '@/lib/form-state'
import { MAX_MAX_SCORE, MIN_MAX_SCORE } from '@/lib/predictions/score-field'
import {
  createSeason,
  createTeam,
  deleteTeam,
  updateMaxScore,
  updateTeam,
} from './actions'

/**
 * Forms for the settings page: competition format, season, teams.
 * One `useActionState` per form, so an error in one does not clear or disturb
 * the others.
 */

/**
 * The competition's default number of rubbers per fixture.
 *
 * Lives on this page because it is the value every fixture inherits — setting
 * it here once beats setting it twenty times. A fixture played over a
 * different number overrides it in its own edit form.
 */
export function SettingsForm({ maxScore }: { maxScore: number }) {
  const [state, formAction] = useFormAction(updateMaxScore)

  return (
    <form action={formAction} className="space-y-4">
      <Field
        id="settings-max-score"
        label="Matchs par rencontre (défaut)"
        hint="Le nombre de matchs joués dans une rencontre d’interclub — 8 en championnat de France. Les deux scores d’un pronostic totalisent ce nombre. Une rencontre peut le remplacer depuis sa fiche. Les scores déjà saisis ne sont pas modifiés."
      >
        <input
          id="settings-max-score"
          name="maxScore"
          type="number"
          inputMode="numeric"
          required
          min={MIN_MAX_SCORE}
          max={MAX_MAX_SCORE}
          defaultValue={maxScore}
          className={`num ${inputClass}`}
        />
      </Field>

      <StateMessage state={state} />
      <SubmitButton>Enregistrer le format</SubmitButton>
    </form>
  )
}

/**
 * Creating a season makes it the current one, which swaps every screen in
 * the app over to it — hence the confirmation when one is already running.
 */
function SeasonForm({
  currentSeasonName,
  onSaved,
}: {
  currentSeasonName?: string
  onSaved: (state: SavedFormState) => void
}) {
  const [state, formAction] = useFormAction(createSeason, onSaved)

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        if (
          currentSeasonName &&
          !confirm(
            `Créer cette saison et la rendre courante ? « ${currentSeasonName} » ne sera plus la saison en cours : rencontres, pronostics et classement basculeront sur la nouvelle.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <Field id="season-name" label="Nom de la saison">
        <input
          id="season-name"
          name="name"
          type="text"
          required
          placeholder="Saison 2026-2027"
          className={inputClass}
        />
      </Field>

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <Field id="season-starts" label="Début">
            <input
              id="season-starts"
              name="startsAt"
              type="date"
              required
              className={inputClass}
            />
          </Field>
        </div>
        <div className="min-w-0 flex-1">
          <Field id="season-ends" label="Fin">
            <input
              id="season-ends"
              name="endsAt"
              type="date"
              required
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <StateMessage state={state} />
      <SubmitButton>
        {currentSeasonName ? 'Créer et passer à cette saison' : 'Créer la saison'}
      </SubmitButton>
    </form>
  )
}

function TeamForm({
  onSaved,
}: {
  onSaved: (state: SavedFormState) => void
}) {
  const [state, formAction] = useFormAction(createTeam, onSaved)

  return (
    <form action={formAction} className="space-y-4">
      <Field id="team-name" label="Nom de l’équipe">
        <input
          id="team-name"
          name="name"
          type="text"
          required
          placeholder="Lyon 1"
          className={inputClass}
        />
      </Field>

      <Field id="team-division" label="Division">
        <input
          id="team-division"
          name="division"
          type="text"
          required
          placeholder="Régionale 1"
          className={inputClass}
        />
      </Field>

      <StateMessage state={state} />
      <SubmitButton>Ajouter l’équipe</SubmitButton>
    </form>
  )
}

export type TeamRow = { id: string; name: string; division: string }

function TeamEditForm({
  team,
  onSaved,
  remove,
}: {
  team: TeamRow
  onSaved: (state: SavedFormState) => void
  remove: DeleteConfig
}) {
  const [state, formAction] = useFormAction(updateTeam, onSaved)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="teamId" value={team.id} />

      <Field id={`${team.id}-name`} label="Nom de l’équipe">
        <input
          id={`${team.id}-name`}
          name="name"
          type="text"
          required
          defaultValue={team.name}
          className={inputClass}
        />
      </Field>

      <Field id={`${team.id}-division`} label="Division">
        <input
          id={`${team.id}-division`}
          name="division"
          type="text"
          required
          defaultValue={team.division}
          className={inputClass}
        />
      </Field>

      <StateMessage state={state} />
      <SaveBar saveLabel="Enregistrer" remove={remove} />
    </form>
  )
}

/**
 * One team in the list: its name and division, and a pencil that opens the
 * edit form. Deleting is an icon beside that form's save button, behind a
 * confirmation, rather than on the card where a stray tap could reach it.
 */
export function TeamCard({ team }: { team: TeamRow }) {
  const [open, setOpen] = useState(false)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  const handleSaved = (state: SavedFormState) => {
    showToast(state.message)
    setCloseRequest((count) => count + 1)
  }

  // Owned here: a successful delete removes this card along with its form.
  const [deleteState, deleteAction] = useFormAction(deleteTeam, handleSaved)

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-sheet py-3 pr-3 pl-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{team.name}</p>
        <p className="mt-0.5 text-xs text-ink-soft">{team.division}</p>
      </div>

      <IconButton label={`Modifier ${team.name}`} onClick={() => setOpen(true)}>
        <Pencil aria-hidden className="size-5" />
      </IconButton>

      {open && (
        <Modal
          title="Modifier l’équipe"
          onClose={() => setOpen(false)}
          requestClose={closeRequest}
        >
          <TeamEditForm
            team={team}
            onSaved={handleSaved}
            remove={{
              action: deleteAction,
              state: deleteState,
              label: 'Supprimer l’équipe',
              confirmMessage: `Supprimer « ${team.name} » ? Toutes ses rencontres, les pronostics et les points associés seront aussi supprimés. Cette action est irréversible.`,
            }}
          />
        </Modal>
      )}
    </li>
  )
}

/**
 * A full-width "add" button that opens a form in a modal.
 *
 * Creating a season happens once a year and adding a team a handful of times;
 * a form left permanently open for either pushed the lists an admin actually
 * reads below the fold. Same pattern as fixtures on the admin page.
 */
function CreateInModal({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: (onSaved: (state: SavedFormState) => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  const handleSaved = (state: SavedFormState) => {
    showToast(state.message)
    if (!state.warning) setCloseRequest((count) => count + 1)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-shuttle-text-soft/50 text-sm font-semibold text-court transition-colors active:bg-sheet/5"
      >
        <Plus aria-hidden className="size-4" strokeWidth={2.5} />
        {label}
      </button>

      {open && (
        <Modal
          title={title}
          onClose={() => setOpen(false)}
          requestClose={closeRequest}
        >
          {children(handleSaved)}
        </Modal>
      )}
    </>
  )
}

export function NewSeasonButton({ currentSeasonName }: { currentSeasonName?: string }) {
  return (
    <CreateInModal label="Nouvelle saison" title="Nouvelle saison">
      {(onSaved) => (
        <SeasonForm currentSeasonName={currentSeasonName} onSaved={onSaved} />
      )}
    </CreateInModal>
  )
}

export function NewTeamButton() {
  return (
    <CreateInModal label="Ajouter une équipe" title="Nouvelle équipe">
      {(onSaved) => <TeamForm onSaved={onSaved} />}
    </CreateInModal>
  )
}
