'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { completeOnboarding, type OnboardingState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : 'Commencer'}
    </button>
  )
}

export function OnboardingForm({
  clubs,
  defaultName,
}: {
  clubs: { id: string; name: string }[]
  defaultName: string
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium text-ink">
          Votre nom
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultName}
          autoComplete="name"
          maxLength={60}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
        <p className="mt-2 text-xs text-ink-soft">
          C’est ce nom qui apparaîtra au classement.
        </p>
      </div>

      <div>
        <label htmlFor="clubId" className="mb-2 block text-sm font-medium text-ink">
          Votre club
        </label>
        <select
          id="clubId"
          name="clubId"
          required
          defaultValue=""
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        >
          <option value="" disabled>
            Choisissez votre club…
          </option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink-soft">
          Vous pronostiquerez les rencontres de ce club.
        </p>
      </div>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
