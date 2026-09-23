'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Pencil } from 'lucide-react'
import { Modal } from '@/components/modal'
import { useToast } from '@/components/toast'
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from '@/lib/users/name-field'
import { updateName, type ProfileState } from './actions'

/**
 * Editing your own pseudo: a pencil beside the page title, opening the form
 * in a modal.
 *
 * The pseudo *is* the profile's title, so the edit affordance sits on it
 * rather than in a card of its own — a permanently-open text input would be
 * noise on every visit for a change made once a season.
 */
export function NameEditButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Modifier le pseudo"
        // The global 44px minimum would push the title line down; the negative
        // margin keeps the full touch target without growing the header.
        className="-my-2 flex shrink-0 items-center justify-center px-1.5 text-shuttle-text-soft active:text-shuttle-text"
      >
        <Pencil aria-hidden className="size-4" />
      </button>

      {open && (
        <Modal
          title="Modifier le pseudo"
          onClose={() => setOpen(false)}
          requestClose={closeRequest}
        >
          <EditForm
            name={name}
            onSaved={(message) => {
              showToast(message)
              setCloseRequest((count) => count + 1)
            }}
          />
        </Modal>
      )}
    </>
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

function EditForm({
  name,
  onSaved,
}: {
  name: string
  onSaved: (message: string) => void
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateName,
    { status: 'idle' },
  )

  // Each submission returns a fresh state object, so this fires once per save.
  useEffect(() => {
    if (state.status === 'saved') onSaved(state.message)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps -- `onSaved` is a new closure every render

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

      <SubmitButton />
    </form>
  )
}
