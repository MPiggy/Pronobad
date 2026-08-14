'use client'

import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Modal } from '@/components/modal'
import { formatPoints } from '@/lib/format'

/** The "?" trigger next to the leaderboard title, opening the scoring rules. */
export function RulesButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Voir les règles du classement"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-sheet text-ink-soft transition-colors active:bg-shuttle/10"
      >
        <CircleHelp aria-hidden className="size-5" />
      </button>

      {open && (
        <Modal title="Règles du classement" onClose={() => setOpen(false)}>
          <p className="text-sm leading-relaxed text-ink-soft">
            Score exact : <span className="font-semibold text-ink">{formatPoints(3)}</span>.
            Bon vainqueur : <span className="font-semibold text-ink">{formatPoints(1)}</span>.
            Les points sont figés au moment de la saisie du résultat.
          </p>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 w-full rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink transition-opacity active:opacity-80"
          >
            J&rsquo;ai compris
          </button>
        </Modal>
      )}
    </>
  )
}
