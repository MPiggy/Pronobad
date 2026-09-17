'use client'

import { useState } from 'react'

/**
 * The two halves of a scoreline, entered together.
 *
 * They are linked rather than independent because a fixture of N rubbers has
 * exactly N winners: typing one side determines the other. Letting a member
 * type 5-2 for a 6-rubber fixture and then rejecting it on submit would be
 * asking for input the fixture cannot produce, so the counterpart fills itself
 * in and the impossible state is never reachable.
 *
 * The server re-checks the same rule — this is a convenience, not the
 * guarantee.
 */
export function ScorePairInput({
  idPrefix,
  homeName,
  awayName,
  homeLabel,
  awayLabel,
  maxScore,
  defaultHome,
  defaultAway,
  size = 'md',
  labels = 'visible',
}: {
  /** Prefixes the input ids, so several of these can share a page. */
  idPrefix: string
  homeName: string
  awayName: string
  homeLabel: string
  awayLabel: string
  maxScore: number
  defaultHome?: number | null
  defaultAway?: number | null
  size?: 'md' | 'lg'
  labels?: 'visible' | 'hidden'
}) {
  const [home, setHome] = useState(defaultHome?.toString() ?? '')
  const [away, setAway] = useState(defaultAway?.toString() ?? '')

  /** Clamps to the fixture's range and derives the other side from it. */
  const link = (raw: string, side: 'home' | 'away') => {
    // Clearing one side only clears that side: the member is mid-edit, and
    // blanking the counterpart too would wipe a value they just typed.
    if (raw === '') {
      if (side === 'home') setHome('')
      else setAway('')
      return
    }

    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return

    const value = Math.min(Math.max(parsed, 0), maxScore)
    const other = (maxScore - value).toString()

    if (side === 'home') {
      setHome(value.toString())
      setAway(other)
    } else {
      setAway(value.toString())
      setHome(other)
    }
  }

  const inputClass =
    size === 'lg'
      ? 'w-full rounded-xl border border-line bg-sheet px-4 py-3 text-center text-2xl font-bold tabular-nums text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30'
      : 'w-full rounded-xl border border-line bg-sheet px-3 py-2.5 text-center text-xl font-bold tabular-nums text-ink outline-none focus-visible:border-court focus-visible:ring-2 focus-visible:ring-court/30'

  const fields = [
    { id: `${idPrefix}-home`, name: homeName, label: homeLabel, value: home, side: 'home' as const },
    { id: `${idPrefix}-away`, name: awayName, label: awayLabel, value: away, side: 'away' as const },
  ]

  return (
    <div className="flex items-end gap-3">
      {fields.map((field, index) => (
        <div key={field.name} className="contents">
          <div className="flex-1">
            <label
              htmlFor={field.id}
              className={
                labels === 'hidden'
                  ? 'sr-only'
                  : 'mb-1.5 block truncate text-xs font-medium text-ink-soft'
              }
            >
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.name}
              type="number"
              inputMode="numeric"
              required
              min={0}
              max={maxScore}
              value={field.value}
              onChange={(event) => link(event.target.value, field.side)}
              placeholder="0"
              className={inputClass}
            />
          </div>

          {index === 0 && (
            <span
              aria-hidden
              className={`font-bold text-ink-soft ${size === 'lg' ? 'pb-3 text-lg' : 'pb-2.5 text-base'}`}
            >
              –
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
