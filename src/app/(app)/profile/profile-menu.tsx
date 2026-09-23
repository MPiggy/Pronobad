'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, LogOut, Settings } from 'lucide-react'
import { Modal } from '@/components/modal'
import { signOut } from './actions'

const ICON_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-xl border border-shuttle-text/12 bg-shuttle-text/5 text-shuttle-text active:bg-shuttle-text/10'

/**
 * The profile header's one button.
 *
 * A member has a single account action — logging out — so that is the button
 * itself. An admin has two, so the button becomes a cog opening a sheet with
 * both: a lone "Admin" link beside a logout icon would crowd the pseudo, which
 * is the page's title.
 */
export function ProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)

  if (!isAdmin) {
    return (
      <form action={signOut}>
        <button type="submit" aria-label="Déconnexion" title="Déconnexion" className={ICON_BUTTON}>
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Réglages"
        title="Réglages"
        className={ICON_BUTTON}
      >
        <Settings aria-hidden className="size-4" />
      </button>

      {open && (
        <Modal title="Réglages" onClose={() => setOpen(false)}>
          <div className="overflow-hidden rounded-2xl border border-line/40">
            <Link
              href="/admin"
              className="flex min-h-12 items-center gap-3 px-4 text-sm font-medium text-ink active:bg-line/10"
            >
              <span className="flex-1">Administration</span>
              <ChevronRight aria-hidden className="size-4 text-ink-soft" />
            </Link>

            <form action={signOut} className="border-t border-line/30">
              <button
                type="submit"
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-loss active:bg-loss/10"
              >
                <LogOut aria-hidden className="size-4" />
                Déconnexion
              </button>
            </form>
          </div>
        </Modal>
      )}
    </>
  )
}
