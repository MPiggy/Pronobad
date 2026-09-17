'use client'

import { useActionState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import {
  IDLE_STATE,
  type FormState,
  type SavedFormState,
} from '@/lib/form-state'

/**
 * The building blocks every admin form is assembled from.
 *
 * Defined once so the fixture editor, the team editor and the settings form
 * share one look — before this, each page carried its own copy with slightly
 * different radii and paddings, and the admin screens read as three apps.
 */

/**
 * `useActionState`, plus a callback run each time a submission lands as
 * `saved` — how a modal form toasts and closes itself.
 *
 * The callback runs straight after the action resolves rather than from an
 * effect on the returned state. A save often moves or removes the very card
 * the form lives in — a result moves a fixture into "Terminées", a delete
 * removes it — and the revalidated page unmounts the form in the same commit,
 * so an effect would never run and the admin would get no confirmation.
 */
export function useFormAction(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
  onSaved?: (state: SavedFormState) => void,
) {
  return useActionState<FormState, FormData>(async (previous, formData) => {
    const next = await action(previous, formData)
    if (next.status === 'saved') onSaved?.(next)
    return next
  }, IDLE_STATE)
}

export const labelClass = 'mb-1.5 block text-xs font-medium text-ink-soft'

export const inputClass =
  'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-sm text-ink outline-none transition-colors focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30'

/** A labelled control, with an optional explanation under it. */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{hint}</p>}
    </div>
  )
}

/**
 * What the last submission produced.
 *
 * A success inside a modal is normally never seen here — the modal toasts it
 * and closes — but a success that carries a `warning` keeps the modal open,
 * and this is where the warning is read.
 */
export function StateMessage({ state }: { state: FormState }) {
  if (state.status === 'error') {
    return (
      <p role="alert" className="text-sm text-loss">
        {state.message}
      </p>
    )
  }

  if (state.status === 'saved') {
    return (
      <div className="space-y-2">
        <p role="status" className="text-sm font-medium text-court-dark">
          {state.message}
        </p>
        {state.warning && (
          <p
            role="alert"
            className="rounded-xl border border-pending/40 bg-pending/10 px-3 py-2.5 text-sm leading-relaxed text-ink"
          >
            {state.warning}
          </p>
        )}
      </div>
    )
  }

  return null
}

export function SubmitButton({
  children,
  variant = 'primary',
  pendingLabel = 'Enregistrement…',
}: {
  children: string
  variant?: 'primary' | 'secondary'
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === 'primary'
          ? 'w-full rounded-xl bg-court px-4 py-3 text-sm font-semibold text-ink transition-opacity active:opacity-90 disabled:opacity-60'
          : 'w-full rounded-xl border border-line bg-sheet px-4 py-3 text-sm font-medium text-ink-soft transition-colors active:bg-shuttle/5 disabled:opacity-60'
      }
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

/**
 * A delete to offer next to an edit form's save button.
 *
 * `action` is the dispatch from `useFormAction(deleteX, …)`, owned by the
 * caller so its success can close the modal the form lives in.
 */
export type DeleteConfig = {
  action: (formData: FormData) => void
  state: FormState
  /** What the icon does, for screen readers and the tooltip. */
  label: string
  /** The confirmation shown before anything is deleted. */
  confirmMessage: string
}

/**
 * An edit form's footer: an icon-only delete on the left, the save button
 * taking the rest of the line.
 *
 * The delete is a second submit button of the same form, pointed at its own
 * action with `formAction` — so the two sit on one line without nesting a
 * form inside another. `formNoValidate` lets an admin delete a record even
 * while a field of the edit form is invalid.
 */
export function SaveBar({
  saveLabel,
  remove,
}: {
  saveLabel: string
  remove?: DeleteConfig
}) {
  const { pending } = useFormStatus()

  return (
    <div className="space-y-2">
      {remove && remove.state.status === 'error' && (
        <StateMessage state={remove.state} />
      )}

      <div className="flex gap-3">
        {remove && (
          <button
            type="submit"
            formAction={remove.action}
            formNoValidate
            disabled={pending}
            aria-label={remove.label}
            title={remove.label}
            onClick={(event) => {
              if (!confirm(remove.confirmMessage)) event.preventDefault()
            }}
            className="flex w-1/5 shrink-0 items-center justify-center rounded-xl bg-loss/10 text-loss transition-colors active:bg-loss/20 disabled:opacity-60"
          >
            <Trash2 aria-hidden className="size-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <SubmitButton>{saveLabel}</SubmitButton>
        </div>
      </div>
    </div>
  )
}

/**
 * A square icon-only button for a secondary action that sits next to a
 * labelled one — edit, delete. 44px, the minimum touch target.
 */
export function IconButton({
  label,
  tone = 'neutral',
  onClick,
  type = 'button',
  children,
}: {
  /** Read by screen readers and shown as a tooltip; the icon has no text. */
  label: string
  tone?: 'neutral' | 'danger'
  onClick?: () => void
  type?: 'button' | 'submit'
  children: ReactNode
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        tone === 'danger'
          ? 'flex size-11 shrink-0 items-center justify-center rounded-xl border border-loss/40 text-loss transition-colors active:bg-loss/10'
          : 'flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft transition-colors active:bg-shuttle/5'
      }
    >
      {children}
    </button>
  )
}
