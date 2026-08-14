'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { resetPassword, type ResetPasswordState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  )
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    { status: 'idle' },
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-shuttle-text"
        >
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby={state.status === 'error' ? 'password-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
        <p className="mt-1 text-xs text-shuttle-text-soft">8 caractères minimum.</p>
      </div>

      {state.status === 'error' && (
        <p id="password-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
