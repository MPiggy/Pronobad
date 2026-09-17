/**
 * The result a form-bound server action reports back through `useActionState`.
 *
 * One shape for every admin and profile form, so a single `StateMessage` can
 * render all of them and a modal can decide whether to close on its own.
 *
 * `warning` rides along with a successful save when the admin needs to read
 * something before moving on — "3 predictions no longer add up and must be
 * re-entered" — which a toast that vanishes after two seconds cannot carry.
 */
export type FormState =
  | { status: 'idle' }
  | { status: 'saved'; message: string; warning?: string }
  | { status: 'error'; message: string }

export type SavedFormState = Extract<FormState, { status: 'saved' }>

export const IDLE_STATE: FormState = { status: 'idle' }
