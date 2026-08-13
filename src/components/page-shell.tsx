import type { ReactNode } from 'react'
import Image from 'next/image'
import logo from '@/app/icon.png'

/**
 * The title block + content column every signed-in page renders inside.
 *
 * The bottom nav lives in `(app)/layout.tsx` instead of here, so it persists
 * across navigation between tabs rather than remounting on every page.
 */
export function PageShell({
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
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+var(--safe-top))]">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={logo}
            alt=""
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-shuttle-text">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-shuttle-text-soft">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </header>

      {children}
    </main>
  )
}

/** Shown wherever a list has nothing in it — never leave a screen blank. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-sheet px-5 py-8 text-center">
      <span aria-hidden className="text-3xl">
        {icon}
      </span>
      <p className="mt-3 font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
