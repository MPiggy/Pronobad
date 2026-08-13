import type { ReactNode } from 'react'
import { isAnyClubAdmin } from '@/lib/auth/permissions'
import { getActor } from '@/lib/auth/guards'
import { BottomNav } from '@/components/bottom-nav'

/**
 * The frame every signed-in page renders inside: title block, content column,
 * bottom nav.
 *
 * The admin tab is decided here, once, from the actor's real rights rather
 * than passed in by each page — a page forgetting the flag would silently hide
 * the tab from an admin. Hiding it is presentation only; `guards.ts` is what
 * actually stops a non-admin from reaching those routes.
 */
export async function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  const actor = await getActor()

  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pt-[calc(1.75rem+var(--safe-top))]">
        <header className="mb-6 flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
            )}
          </div>
          {action}
        </header>

        {children}
      </main>

      <BottomNav showAdmin={isAnyClubAdmin(actor)} />
    </>
  )
}

/**
 * Shown wherever a list has nothing in it.
 *
 * An empty screen is an invitation to act, so the body says what will fill it
 * or what to do next — never just "rien à afficher".
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-sheet px-5 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-sm leading-relaxed text-ink-soft">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
