'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MatchCardData } from '@/components/match-card'
import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  dayKeyToDate,
  dayStatus,
  fixtureStatus,
  FixtureStatus,
  initialDayKey,
  monthOfDayKey,
  parisDayKey,
} from '@/lib/fixtures/calendar'
import { formatLongDay, formatMonthYear } from '@/lib/format'
import { MatchModalTrigger } from '../fixtures/match-modal-trigger'

export type CalendarEntry = {
  match: MatchCardData
  /** The fixture's resolved score cap, as the list view gets it. */
  maxScore: number
}

/** Column headers only — each day button's label already names its weekday. */
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

/**
 * Fill and dot colors per status. Filled for everything a member has a result
 * or an action on; `PENDING` is only an outline, since there's nothing to see
 * or do yet — the calendar should read as "gold = act, green/blue/red = done".
 */
const STATUS_STYLES: Record<FixtureStatus, { day: string; dot: string; label: string }> = {
  [FixtureStatus.ToPredict]: {
    day: 'bg-court text-ink',
    dot: 'bg-court',
    label: 'À pronostiquer',
  },
  [FixtureStatus.Pending]: {
    day: 'border-2 border-shuttle-text-soft text-shuttle-text',
    dot: 'border border-shuttle-text-soft',
    label: 'En attente',
  },
  [FixtureStatus.Exact]: {
    day: 'bg-win text-white',
    dot: 'bg-win',
    label: '+3 Score exact',
  },
  [FixtureStatus.Outcome]: {
    day: 'bg-partial text-white',
    dot: 'bg-partial',
    label: '+1 Bon vainqueur',
  },
  [FixtureStatus.Wrong]: {
    day: 'bg-loss text-white',
    dot: 'bg-loss',
    label: '0 Manqué',
  },
}

/**
 * The season as a month grid: each fixture day is colored by what it means for
 * the member, and tapping it lists that day's fixtures underneath — the same
 * cards as the list view, so betting from here is the same two taps.
 */
export function FixtureCalendar({
  entries,
  now,
}: {
  entries: CalendarEntry[]
  now: Date
}) {
  const byDay = useMemo(() => {
    const days = new Map<string, CalendarEntry[]>()
    for (const entry of entries) {
      const key = parisDayKey(entry.match.playedAt)
      days.set(key, [...(days.get(key) ?? []), entry])
    }
    return days
  }, [entries])

  const [selectedDay, setSelectedDay] = useState(() =>
    initialDayKey(entries.map((entry) => entry.match), now),
  )
  const [month, setMonth] = useState(() => monthOfDayKey(selectedDay))

  // Navigation stops at the season's first and last fixture months: past them
  // there is nothing to show but empty grids.
  const dayKeys = [...byDay.keys()].sort()
  const firstMonth = dayKeys[0] ? monthOfDayKey(dayKeys[0]) : month
  const lastMonth = dayKeys.at(-1) ? monthOfDayKey(dayKeys.at(-1)!) : month
  const canGoBack = compareMonths(month, firstMonth) > 0
  const canGoForward = compareMonths(month, lastMonth) < 0

  const today = parisDayKey(now)
  const selectedEntries = byDay.get(selectedDay) ?? []

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line/60 bg-shuttle-text/5 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, -1))}
            disabled={!canGoBack}
            aria-label="Mois précédent"
            className="flex w-11 items-center justify-center rounded-full text-shuttle-text active:bg-shuttle-text/10 disabled:opacity-30"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <h3
            aria-live="polite"
            className="text-base font-semibold capitalize text-shuttle-text"
          >
            {formatMonthYear(dayKeyToDate(`${month.year}-${String(month.month).padStart(2, '0')}-01`))}
          </h3>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            disabled={!canGoForward}
            aria-label="Mois suivant"
            className="flex w-11 items-center justify-center rounded-full text-shuttle-text active:bg-shuttle-text/10 disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        <div aria-hidden className="grid grid-cols-7">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="py-1 text-center text-xs font-medium text-shuttle-text-soft"
            >
              {weekday.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {buildMonthGrid(month).map((dayKey, index) => {
            if (!dayKey) return <span key={`pad-${index}`} />

            const day = Number(dayKey.slice(-2))
            const dayEntries = byDay.get(dayKey)
            const isToday = dayKey === today

            if (!dayEntries) {
              return (
                <span
                  key={dayKey}
                  className="flex h-12 flex-col items-center justify-center"
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm tabular-nums ${
                      isToday
                        ? 'font-bold text-court underline decoration-2 underline-offset-4'
                        : 'text-shuttle-text-soft'
                    }`}
                  >
                    {day}
                  </span>
                </span>
              )
            }

            const statuses = dayEntries.map((entry) => fixtureStatus(entry.match, now))
            const status = dayStatus(statuses)!
            const isSelected = dayKey === selectedDay

            return (
              <div key={dayKey} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedDay(dayKey)}
                  aria-pressed={isSelected}
                  aria-label={`${formatLongDay(dayKeyToDate(dayKey))} : ${dayEntries.length} rencontre${dayEntries.length > 1 ? 's' : ''}, ${statuses.map((s) => STATUS_STYLES[s].label).join(', ')}`}
                  className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl ${
                    isSelected ? 'bg-shuttle-text/15' : 'active:bg-shuttle-text/10'
                  }`}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-bold tabular-nums ${STATUS_STYLES[status].day} ${
                      isToday ? 'underline decoration-2 underline-offset-2' : ''
                    }`}
                  >
                    {day}
                  </span>
                  {statuses.length > 1 && (
                    <span aria-hidden className="flex gap-0.5">
                      {statuses.map((s, i) => (
                        <span key={i} className={`size-1.5 rounded-full ${STATUS_STYLES[s].dot}`} />
                      ))}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-line/40 pt-3">
          {Object.values(FixtureStatus).map((status) => (
            <li key={status} className="flex items-center gap-1.5 text-xs text-shuttle-text-soft">
              <span aria-hidden className={`size-2.5 rounded-full ${STATUS_STYLES[status].dot}`} />
              {STATUS_STYLES[status].label}
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="day-heading">
        <h2
          id="day-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-shuttle-text-soft"
        >
          {formatLongDay(dayKeyToDate(selectedDay))}
        </h2>

        {selectedEntries.length === 0 ? (
          <p className="rounded-2xl border border-line bg-sheet px-4 py-3 text-sm text-ink-soft">
            Aucune rencontre ce jour-là.
          </p>
        ) : (
          <ul className="space-y-3">
            {selectedEntries.map(({ match, maxScore }) => (
              <li key={match.id}>
                <MatchModalTrigger match={match} now={now} maxScore={maxScore} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
