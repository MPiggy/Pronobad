'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/modal'
import { useToast } from '@/components/toast'
import { FixtureForm, type TeamOption } from './fixture-form'

/**
 * Opens the fixture form empty. Lives on the admin page next to the fixtures
 * it creates, rather than on the settings page — an admin entering the
 * season's calendar should not have to leave the list they are filling.
 */
export function NewFixtureButton({
  teams,
  defaultMaxScore,
  variant = 'icon',
}: {
  teams: TeamOption[]
  defaultMaxScore: number
  /** `icon` for the page header, `text` for an empty state's call to action. */
  variant?: 'icon' | 'text'
}) {
  const [open, setOpen] = useState(false)
  const [closeRequest, setCloseRequest] = useState(0)
  const showToast = useToast()

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Nouvelle rencontre"
          title="Nouvelle rencontre"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-court text-ink shadow-lg shadow-court/20 transition-opacity active:opacity-90"
        >
          <Plus aria-hidden className="size-6" strokeWidth={2.5} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-court px-4 text-sm font-semibold text-ink transition-opacity active:opacity-90"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          Créer une rencontre
        </button>
      )}

      {open && (
        <Modal
          title="Nouvelle rencontre"
          onClose={() => setOpen(false)}
          requestClose={closeRequest}
        >
          <FixtureForm
            teams={teams}
            defaultMaxScore={defaultMaxScore}
            onSaved={(state) => {
              showToast(state.message)
              setCloseRequest((count) => count + 1)
            }}
          />
        </Modal>
      )}
    </>
  )
}
