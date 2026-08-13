import type { ReactNode } from 'react'

/**
 * The match-sheet primitive: a white panel on the warm ground, bounded by a
 * hairline rule rather than a shadow.
 *
 * `marker` paints a 3px edge down the left. Status is encoded positionally so
 * a member scanning a list tracks one vertical line instead of reading a pill
 * on every row — which is what the emoji badges used to cost them.
 */

export type SheetMarker = 'action' | 'pending' | 'win' | 'loss' | 'none'

const MARKERS: Record<SheetMarker, string> = {
  action: 'before:bg-court',
  pending: 'before:bg-pending',
  win: 'before:bg-win',
  loss: 'before:bg-loss',
  none: 'before:bg-line',
}

export function Sheet({
  marker = 'none',
  interactive = false,
  className = '',
  children,
}: {
  marker?: SheetMarker
  /** Adds the pressed-state feedback used when the whole sheet is a link. */
  interactive?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-line bg-sheet before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] ${MARKERS[marker]} ${
        interactive ? 'transition-colors active:bg-shuttle' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * A short status word, set as a quiet label rather than a coloured badge.
 *
 * The edge-marker already carries the state visually; repeating it in a filled
 * pill would say the same thing twice and add noise to a dense list. This is
 * also what keeps the status legible to anyone who cannot distinguish the
 * marker colours.
 */
export function StatusLabel({ children }: { children: ReactNode }) {
  return <span className="eyebrow shrink-0">{children}</span>
}

/** Section heading used above a group of sheets. */
export function SectionHeading({
  children,
  aside,
  id,
}: {
  children: ReactNode
  aside?: ReactNode
  id?: string
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
      <h2 id={id} className="eyebrow">
        {children}
      </h2>
      {aside && <span className="text-xs text-ink-soft">{aside}</span>}
    </div>
  )
}
