'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from '@/lib/users/name-field'
import { updateName, type ProfileState } from './actions'

/**
 * Editing your own pseudo.
 *
 * Behind a `<details>` like the admin edit forms: the profile is a screen a
 * member opens to read their history, and a permanently-open text input at the
 * top of it would be noise on every visit for a change made once a season.
 */
export function NameForm({ name }: { name: string }) {
  return (
    <section className="rounded-2xl border border-line bg-sheet p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-soft">Pseudo</p>
          <p className="mt-0.5 truncate font-medium text-ink">{name}</p>
        </div>
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-court-dark marker:content-none">
          <span className="group-open:hidden">Modifier</span>
          <span className="hidden group-open:inline">Fermer</span>
        </summary>

        <div className="mt-3">
          <EditForm name={name} />
        </div>
      </details>
    </section>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-sm font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : 'Enregistrer le pseudo'}
    </button>
  )
}

function EditForm({ name }: { name: string }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateName,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="profile-name" className="sr-only">
          Pseudo
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          required
          minLength={NAME_MIN_LENGTH}
          maxLength={NAME_MAX_LENGTH}
          defaultValue={name}
          autoComplete="nickname"
          className="w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        C’est le nom affiché au classement et dans l’historique.
      </p>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      {state.status === 'saved' && (
        <p role="status" className="text-sm font-medium text-court-dark">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
