import { AlarmClock } from 'lucide-react'
import { formatTimeRemaining } from '@/lib/format'

/**
 * A nudge for fixtures the member hasn't predicted and is about to lose.
 *
 * Only rendered inside the closing window — a banner that is always there
 * stops being read.
 */
export function ClosingSoonBanner({
  count,
  msUntilFirst,
}: {
  count: number
  msUntilFirst: number
}) {
  const fixtures = count > 1 ? `${count} rencontres à pronostiquer` : '1 rencontre à pronostiquer'

  return (
    <p
      role="status"
      className="flex items-center gap-3 rounded-2xl border border-court/50 bg-court/10 px-4 py-3 text-sm text-shuttle-text"
    >
      <AlarmClock aria-hidden className="size-5 shrink-0 text-court" />
      <span>
        <span className="font-semibold text-court">{fixtures}</span>
        {count > 1 ? ' — la première ' : ' — '}
        {formatTimeRemaining(msUntilFirst)}
      </span>
    </p>
  )
}
