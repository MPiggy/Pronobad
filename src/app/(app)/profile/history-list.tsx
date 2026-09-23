'use client'

import { useState } from 'react'
import type { MatchCardData } from '@/components/match-card'
import { MatchModalTrigger } from '../fixtures/match-modal-trigger'

type Filter = 'all' | 'upcoming' | 'won' | 'missed'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'won', label: 'Gagnés' },
  { value: 'missed', label: 'Manqués' },
]

/** Which filter a prediction falls under: unscored ones are still to come. */
function categoryOf(match: MatchCardData): Exclude<Filter, 'all'> {
  const score = match.prediction?.score
  if (!score) return 'upcoming'
  return score.points > 0 ? 'won' : 'missed'
}

/**
 * The member's predictions, with a row of filters over them.
 *
 * Filtering runs here rather than through the URL: the whole season's history
 * is already on the page, and a tap should swap the list instantly instead of
 * waiting on a server round trip from a gym with bad wifi.
 */
export function HistoryList({
  entries,
  now,
}: {
  entries: { match: MatchCardData; maxScore: number }[]
  now: Date
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const count = (value: Filter) =>
    value === 'all'
      ? entries.length
      : entries.filter(({ match }) => categoryOf(match) === value).length

  const shown =
    filter === 'all'
      ? entries
      : entries.filter(({ match }) => categoryOf(match) === filter)

  return (
    <>
      <div
        role="group"
        aria-label="Filtrer l’historique"
        className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5"
      >
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === value
                ? 'border-court bg-court text-ink'
                : 'border-shuttle-text/15 text-shuttle-text-soft active:bg-shuttle-text/10'
            }`}
          >
            {label} · <span className="tabular-nums">{count(value)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-shuttle-text/10 px-4 py-3 text-sm text-shuttle-text-soft">
          Aucun pronostic dans cette catégorie.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map(({ match, maxScore }) => (
            <li key={match.id}>
              <MatchModalTrigger match={match} now={now} maxScore={maxScore} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
