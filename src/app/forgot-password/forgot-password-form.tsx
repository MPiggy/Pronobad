'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { requestPasswordReset, type ForgotPasswordState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? 'Envoi…' : 'Envoyer le lien'}
    </button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    { status: 'idle' },
  )

  if (state.status === 'sent') {
    return (
      <div
        role="status"
        className="rounded-xl border border-line bg-sheet p-5 text-center"
      >
        <div className="mb-3 text-3xl" aria-hidden="true">
          📬
        </div>
        <h2 className="mb-2 font-semibold text-ink">Vérifiez vos e-mails</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Si un compte existe pour cette adresse, un lien de réinitialisation
          vient d’être envoyé. Il expire dans une heure.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Adresse e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="vous@club.fr"
          aria-describedby={state.status === 'error' ? 'email-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      {state.status === 'error' && (
        <p id="email-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
