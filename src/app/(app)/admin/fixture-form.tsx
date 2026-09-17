'use client'

import { useRef, useState } from 'react'
import {
  Field,
  inputClass,
  SaveBar,
  StateMessage,
  useFormAction,
  type DeleteConfig,
} from '@/components/form-controls'
import type { SavedFormState } from '@/lib/form-state'
import { MAX_ROUND, MIN_ROUND } from '@/lib/fixtures/fixture-fields'
import { MAX_MAX_SCORE, MIN_MAX_SCORE } from '@/lib/predictions/score-field'
import { createMatch, updateMatch } from './actions'

/**
 * The one form a fixture is created and edited with — teams, round, date,
 * deadline and format together, saved by one button.
 *
 * The deadline is a checkbox rather than a second date field by default:
 * nearly every fixture closes at kickoff, and an admin rescheduling one should
 * not have to think about the deadline at all unless they had deliberately
 * moved it. Untick, and the field appears prefilled with the date they just
 * typed.
 */

export type TeamOption = { id: string; name: string }

export type FixtureFormValues = {
  homeTeamId: string
  awayTeamId: string
  round: number
  /** `playedAt` pre-formatted as a Paris `datetime-local` value by the server. */
  playedAtLocal: string
  /** `locksAt` pre-formatted as a Paris `datetime-local` value by the server. */
  locksAtLocal: string
  /** The fixture's own rubber count, or null when it follows the default. */
  maxScore: number | null
}

function TeamSelect({
  id,
  name,
  label,
  teams,
  defaultValue,
}: {
  id: string
  name: string
  label: string
  teams: TeamOption[]
  defaultValue: string
}) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        name={name}
        required
        defaultValue={defaultValue}
        className={inputClass}
      >
        <option value="" disabled>
          Choisir une équipe…
        </option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function FixtureForm({
  matchId,
  values,
  teams,
  defaultMaxScore,
  onSaved,
  remove,
}: {
  /** Set when editing; absent when creating. */
  matchId?: string
  values?: FixtureFormValues
  teams: TeamOption[]
  /** The competition default, shown as the format field's placeholder. */
  defaultMaxScore: number
  onSaved: (state: SavedFormState) => void
  /** Offers deleting the fixture next to the save button. */
  remove?: DeleteConfig
}) {
  const [state, formAction] = useFormAction(matchId ? updateMatch : createMatch, onSaved)

  const prefix = matchId ?? 'new-fixture'
  const playedAtRef = useRef<HTMLInputElement>(null)

  const [atKickoff, setAtKickoff] = useState(
    values ? values.locksAtLocal === values.playedAtLocal : true,
  )
  // What the deadline field shows when it appears: the fixture's own deadline
  // if it had one, else whatever date is currently typed above it.
  const [locksAtDefault, setLocksAtDefault] = useState(values?.locksAtLocal ?? '')

  const toggleKickoff = (checked: boolean) => {
    if (!checked) {
      const hadOwnDeadline =
        values !== undefined && values.locksAtLocal !== values.playedAtLocal
      setLocksAtDefault(
        hadOwnDeadline ? values.locksAtLocal : (playedAtRef.current?.value ?? ''),
      )
    }
    setAtKickoff(checked)
  }

  return (
    <form action={formAction} className="space-y-4">
      {matchId && <input type="hidden" name="matchId" value={matchId} />}

      <TeamSelect
        id={`${prefix}-home`}
        name="homeTeamId"
        label="Équipe à domicile"
        teams={teams}
        defaultValue={values?.homeTeamId ?? ''}
      />

      <TeamSelect
        id={`${prefix}-away`}
        name="awayTeamId"
        label="Équipe à l’extérieur"
        teams={teams}
        defaultValue={values?.awayTeamId ?? ''}
      />

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <Field id={`${prefix}-playedAt`} label="Date et heure (Paris)">
            <input
              ref={playedAtRef}
              id={`${prefix}-playedAt`}
              name="playedAt"
              type="datetime-local"
              required
              defaultValue={values?.playedAtLocal}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="w-24 shrink-0">
          <Field id={`${prefix}-round`} label="Journée">
            <input
              id={`${prefix}-round`}
              name="round"
              type="number"
              inputMode="numeric"
              required
              min={MIN_ROUND}
              max={MAX_ROUND}
              defaultValue={values?.round}
              placeholder="1"
              className={`num ${inputClass}`}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="locksAtKickoff"
            checked={atKickoff}
            onChange={(event) => toggleKickoff(event.target.checked)}
            className="size-5 shrink-0 accent-court-dark scheme-light"
          />
          Les pronostics ferment au coup d’envoi
        </label>

        {!atKickoff && (
          <Field
            id={`${prefix}-locksAt`}
            label="Fermeture des pronostics (Paris)"
            hint="Chaque changement est journalisé : avancer cette date ferme des pronostics, la reculer en rouvre."
          >
            <input
              id={`${prefix}-locksAt`}
              name="locksAt"
              type="datetime-local"
              required
              defaultValue={locksAtDefault}
              className={inputClass}
            />
          </Field>
        )}
      </div>

      <Field
        id={`${prefix}-maxScore`}
        label="Matchs joués dans la rencontre"
        hint={`Les deux scores d’un pronostic totalisent ce nombre. Vide : suit le réglage général (${defaultMaxScore}).`}
      >
        <input
          id={`${prefix}-maxScore`}
          name="maxScore"
          type="number"
          inputMode="numeric"
          min={MIN_MAX_SCORE}
          max={MAX_MAX_SCORE}
          defaultValue={values?.maxScore ?? ''}
          placeholder={`${defaultMaxScore} (défaut)`}
          className={`num ${inputClass}`}
        />
      </Field>

      <StateMessage state={state} />

      <SaveBar
        saveLabel={matchId ? 'Enregistrer' : 'Créer la rencontre'}
        remove={remove}
      />
    </form>
  )
}
