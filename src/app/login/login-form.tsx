'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { demoLogin, login, type LoginState } from './actions'

function SubmitButton({
  label = 'Se connecter',
  pendingLabel = 'Connexion…',
}: {
  label?: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {
    status: 'idle',
  })

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
          aria-describedby={state.status === 'error' ? 'login-error' : undefined}
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
          autoComplete="current-password"
          aria-describedby={state.status === 'error' ? 'login-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-xl border border-line bg-sheet px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30"
        />
      </div>

      {state.status === 'error' && (
        <p id="login-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

/** Demo mode (MVP): a name is enough — no e-mail, no magic link. */
export function DemoLoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(demoLogin, {
    status: 'idle',
  })

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Votre nom
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="Camille Dupont"
          aria-describedby={state.status === 'error' ? 'name-error' : undefined}
          aria-invalid={state.status === 'error'}
          className="w-full rounded-md border border-line bg-sheet px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus-visible:border-court"
        />
      </div>

      {state.status === 'error' && (
        <p id="name-error" role="alert" className="text-sm text-loss">
          {state.message}
        </p>
      )}

      <SubmitButton label="Entrer" pendingLabel="Connexion…" />

      <p className="text-center text-xs leading-relaxed text-shuttle-text-soft">
        Version démo : entrez simplement un nom pour découvrir l’application.
      </p>
    </form>
  )
}
