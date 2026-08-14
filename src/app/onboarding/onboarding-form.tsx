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
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : 'Créer mon compte'}
    </button>
  )
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Pseudo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultName}
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Camille Dupont"
          aria-describedby={state.status === 'error' ? 'onboarding-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby={state.status === 'error' ? 'onboarding-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
        <p className="mt-1 text-xs text-ink-soft">8 caractères minimum.</p>
      </div>

      {state.status === 'error' && (
        <p id="onboarding-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
