'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { sendMagicLink, type LoginState } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-court px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-opacity active:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Envoi…' : 'Recevoir mon lien'}
    </button>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    sendMagicLink,
    { status: 'idle' },
  )

  if (state.status === 'sent') {
    return (
      <div
        // Announced to screen readers: the page does not navigate, so without
        // this the confirmation is silent for anyone not looking at the screen.
        role="status"
        className="rounded-lg border border-line bg-sheet p-5"
      >
        <p className="eyebrow mb-2.5">Lien envoyé</p>
        <h2 className="mb-2 font-semibold text-ink">Vérifiez vos e-mails</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Un lien de connexion est parti vers{' '}
          <span className="font-medium text-ink">{state.email}</span>. Il expire
          dans une heure et ne fonctionne qu’une fois.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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
          className="w-full rounded-md border border-line bg-sheet px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-court"
        />
      </div>

      {state.status === 'error' && (
        <p id="email-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs leading-relaxed text-ink-soft">
        Pas de mot de passe : vous recevez un lien de connexion par e-mail.
      </p>
    </form>
  )
}
