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
      <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+var(--safe-top))]">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
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

/** Shown wherever a list has nothing in it — never leave a screen blank. */
export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-8 text-center">
      <span aria-hidden className="text-3xl">
        {icon}
      </span>
      <p className="mt-3 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  )
}
