'use client'

import { useState, type ReactNode } from 'react'
import { CalendarDays, List } from 'lucide-react'
import { type CalendarEntry, FixtureCalendar } from './fixture-calendar'

type View = 'list' | 'calendar'

const VIEWS = [
  { value: 'list', label: 'Liste', Icon: List },
  { value: 'calendar', label: 'Calendrier', Icon: CalendarDays },
] as const

/**
 * Switches the home tab between the fixture list and the calendar.
 *
 * The list arrives already rendered by the server as `list`; only the switch
 * and the calendar itself need to run on the client.
 */
export function FixturesView({
  list,
  entries,
  now,
}: {
  list: ReactNode
  entries: CalendarEntry[]
  now: Date
}) {
  const [view, setView] = useState<View>('list')

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Affichage des rencontres"
        className="grid grid-cols-2 gap-1 rounded-full border border-line/60 bg-shuttle-text/5 p-1"
      >
        {VIEWS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${
              view === value
                ? 'bg-court text-ink'
                : 'text-shuttle-text-soft active:bg-shuttle-text/10'
            }`}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'list' ? list : <FixtureCalendar entries={entries} now={now} />}
    </div>
  )
}
