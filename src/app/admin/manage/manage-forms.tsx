'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  createClub,
  createMatch,
  createSeason,
  createTeam,
  grantClubAdmin,
  revokeClubAdmin,
  type ManageState,
} from './actions'

/**
 * Creation forms for the structure page: season, club, team, fixture, and
 * club-admin grants. One `useActionState` per form, so an error in one does
 * not clear or disturb the others.
 */

export type ClubOption = { id: string; name: string }
export type TeamOption = { id: string; name: string; clubName: string }

const IDLE: ManageState = { status: 'idle' }

function StateMessage({ state }: { state: ManageState }) {
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

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-court px-4 py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : children}
    </button>
  )
}

const labelClass = 'mb-1.5 block text-xs font-medium text-ink-soft'
const inputClass =
  'w-full rounded-md border border-line bg-shuttle px-3 py-2 text-sm text-ink outline-none transition-colors focus-visible:border-court focus-visible:bg-sheet'

function ClubSelect({
  id,
  name,
  clubs,
  label,
}: {
  id: string
  name: string
  clubs: ClubOption[]
  label: string
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} name={name} required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Choisir un club…
        </option>
        {clubs.map((club) => (
          <option key={club.id} value={club.id}>
            {club.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SeasonForm() {
  const [state, formAction] = useActionState<ManageState, FormData>(
    createSeason,
    IDLE,
  )

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="season-name" className={labelClass}>
          Nom de la saison
        </label>
        <input
          id="season-name"
          name="name"
          type="text"
          required
          placeholder="Saison 2026-2027"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="season-starts" className={labelClass}>
            Début
          </label>
          <input
            id="season-starts"
            name="startsAt"
            type="date"
            required
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="season-ends" className={labelClass}>
            Fin
          </label>
          <input
            id="season-ends"
            name="endsAt"
            type="date"
            required
            className={inputClass}
          />
        </div>
      </div>

      <StateMessage state={state} />
      <SubmitButton>Créer et activer la saison</SubmitButton>
    </form>
  )
}

export function ClubForm() {
  const [state, formAction] = useActionState<ManageState, FormData>(
    createClub,
    IDLE,
  )

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="club-name" className={labelClass}>
          Nom du club
        </label>
        <input
          id="club-name"
          name="name"
          type="text"
          required
          placeholder="Badminton Club de Lyon"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="club-region" className={labelClass}>
          Région (facultatif)
        </label>
        <input
          id="club-region"
          name="region"
          type="text"
          placeholder="Auvergne-Rhône-Alpes"
          className={inputClass}
        />
      </div>

      <StateMessage state={state} />
      <SubmitButton>Créer le club</SubmitButton>
    </form>
  )
}

export function TeamForm({ clubs }: { clubs: ClubOption[] }) {
  const [state, formAction] = useActionState<ManageState, FormData>(
    createTeam,
    IDLE,
  )

  return (
    <form action={formAction} className="space-y-3">
      <ClubSelect id="team-club" name="clubId" clubs={clubs} label="Club" />

      <div>
        <label htmlFor="team-name" className={labelClass}>
          Nom de l’équipe
        </label>
        <input
          id="team-name"
          name="name"
          type="text"
          required
          placeholder="Badminton Club de Lyon 1"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="team-division" className={labelClass}>
          Division
        </label>
        <input
          id="team-division"
          name="division"
          type="text"
          required
          placeholder="Régionale 1"
          className={inputClass}
        />
      </div>

      <StateMessage state={state} />
      <SubmitButton>Créer l’équipe</SubmitButton>
    </form>
  )
}

function TeamSelect({
  id,
  name,
  teams,
  label,
}: {
  id: string
  name: string
  teams: TeamOption[]
  label: string
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} name={name} required defaultValue="" className={inputClass}>
        <option value="" disabled>
          Choisir une équipe…
        </option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function MatchForm({ teams }: { teams: TeamOption[] }) {
  const [state, formAction] = useActionState<ManageState, FormData>(
    createMatch,
    IDLE,
  )

  return (
    <form action={formAction} className="space-y-3">
      <TeamSelect
        id="match-home"
        name="homeTeamId"
        teams={teams}
        label="Équipe à domicile"
      />
      <TeamSelect
        id="match-away"
        name="awayTeamId"
        teams={teams}
        label="Équipe à l’extérieur"
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="match-played-at" className={labelClass}>
            Date et heure (Paris)
          </label>
          <input
            id="match-played-at"
            name="playedAt"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>
        <div className="w-24">
          <label htmlFor="match-round" className={labelClass}>
            Journée
          </label>
          <input
            id="match-round"
            name="round"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={52}
            placeholder="1"
            className={`num ${inputClass}`}
          />
        </div>
      </div>

      <StateMessage state={state} />
      <SubmitButton>Créer la rencontre</SubmitButton>
    </form>
  )
}

export function GrantAdminForm({ clubs }: { clubs: ClubOption[] }) {
  const [state, formAction] = useActionState<ManageState, FormData>(
    grantClubAdmin,
    IDLE,
  )

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="grant-email" className={labelClass}>
          Adresse e-mail du membre
        </label>
        <input
          id="grant-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="membre@club.fr"
          className={inputClass}
        />
      </div>

      <ClubSelect
        id="grant-club"
        name="clubId"
        clubs={clubs}
        label="Club à administrer"
      />

      <StateMessage state={state} />
      <SubmitButton>Nommer administrateur</SubmitButton>
    </form>
  )
}

export function RevokeAdminButton({
  userId,
  clubId,
}: {
  userId: string
  clubId: string
}) {
  const [state, formAction] = useActionState<ManageState, FormData>(
    revokeClubAdmin,
    IDLE,
  )

  return (
    <form action={formAction} className="shrink-0 text-right">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="clubId" value={clubId} />
      <button
        type="submit"
        className="text-xs font-medium text-loss underline-offset-2 active:underline"
      >
        Retirer
      </button>
      {state.status === 'error' && (
        <p role="alert" className="mt-1 text-xs text-loss">
          {state.message}
        </p>
      )}
    </form>
  )
}
