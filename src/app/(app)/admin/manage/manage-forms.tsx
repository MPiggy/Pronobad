'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ImageIcon, Pencil, Plus } from 'lucide-react'
import { Modal } from '@/components/modal'
import { TeamLogo } from '@/components/team-logo'
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
  LOGO_ACCEPT,
  MAX_LOGO_UPLOAD_BYTES,
  teamLogoUrl,
  type TeamDisplay,
} from '@/lib/teams/logo'
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

/**
 * The logo picker shared by the create and edit forms: a preview tile, the
 * file input, and — when the team already has a logo — a box to remove it.
 *
 * The preview is the file as picked, not as it will be stored: the server
 * trims and shrinks it, so the saved logo can sit a little larger in its tile.
 * Oversized files are refused here, before the upload: past the server
 * action's body limit, the server could only fail without a message.
 */
function LogoField({ id, team }: { id: string; team?: TeamRow }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [remove, setRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  // React resets a form's fields once its action settles. The file input
  // empties with it, so the preview and the box must follow.
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form) return

    const onReset = () => {
      setPreview(null)
      setRemove(false)
      setError(null)
    }

    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [])

  const current = team ? teamLogoUrl(team) : null
  const shown = preview ?? (remove ? null : current)

  return (
    <Field
      id={id}
      label="Logo (facultatif)"
      hint={`PNG, JPEG, WebP ou SVG, ${MAX_LOGO_UPLOAD_BYTES / 1024 / 1024} Mo maximum. Les bords vides sont rognés et l’image réduite automatiquement ; elle s’affiche sur fond blanc.`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-black/10">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Aperçu du logo" className="size-full object-contain" />
          ) : (
            <ImageIcon aria-hidden className="size-5 text-ink-soft" />
          )}
        </span>

        <input
          ref={inputRef}
          id={id}
          name="logo"
          type="file"
          accept={LOGO_ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file && file.size > MAX_LOGO_UPLOAD_BYTES) {
              event.target.value = ''
              setPreview(null)
              setError(
                `Ce fichier pèse ${(file.size / 1024 / 1024).toFixed(1)} Mo : ${MAX_LOGO_UPLOAD_BYTES / 1024 / 1024} Mo maximum.`,
              )
              return
            }

            setError(null)
            setPreview(file ? URL.createObjectURL(file) : null)
          }}
          className="min-w-0 flex-1 text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-court-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-court-dark"
        />
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-loss">
          {error}
        </p>
      )}

      {current && !preview && (
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="removeLogo"
            checked={remove}
            onChange={(event) => setRemove(event.target.checked)}
            className="size-4 accent-court"
          />
          Retirer le logo
        </label>
      )}
    </Field>
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

      <LogoField id="team-logo" />

      <StateMessage state={state} />
      <SubmitButton>Ajouter l’équipe</SubmitButton>
    </form>
  )
}

export type TeamRow = TeamDisplay & { division: string }

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

      <LogoField id={`${team.id}-logo`} team={team} />

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
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-sheet py-3 pr-3 pl-3">
      <TeamLogo team={team} size="md" />

      <div className="min-w-0 flex-1">
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
