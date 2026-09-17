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
 * Each input is labelled with its team's name, directly above it. Names are
 * allowed to wrap rather than truncate — "Badminton Club Villeurbanne 3" cut
 * to "Badminton Club Vill…" leaves a member guessing which box is which. A
 * grid keeps both inputs on the same line however many lines each label takes.
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

  const labelClass = `self-end text-center font-semibold leading-snug text-balance break-words hyphens-auto text-ink ${
    size === 'lg' ? 'text-sm' : 'text-xs'
  }`

  const homeId = `${idPrefix}-home`
  const awayId = `${idPrefix}-away`

  const input = (id: string, name: string, value: string, side: 'home' | 'away') => (
    <input
      id={id}
      name={name}
      type="number"
      inputMode="numeric"
      required
      min={0}
      max={maxScore}
      value={value}
      onChange={(event) => link(event.target.value, side)}
      placeholder="0"
      className={inputClass}
    />
  )

  return (
    // Row 1: the two labels, bottom-aligned so a one-line name sits right on
    // its input next to a two-line one. Row 2: the inputs and the dash.
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-2">
      <label htmlFor={homeId} className={labelClass}>
        {homeLabel}
      </label>
      <span aria-hidden />
      <label htmlFor={awayId} className={labelClass}>
        {awayLabel}
      </label>

      {input(homeId, homeName, home, 'home')}
      <span
        aria-hidden
        className={`self-center font-bold text-ink-soft ${size === 'lg' ? 'text-lg' : 'text-base'}`}
      >
        –
      </span>
      {input(awayId, awayName, away, 'away')}
    </div>
  )
}
