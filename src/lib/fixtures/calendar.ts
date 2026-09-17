import { lockState } from '@/lib/predictions/locking'
import {
  POINTS_CORRECT_OUTCOME,
  POINTS_EXACT_SCORE,
} from '@/lib/scoring/rules'

/**
 * The calendar view of the fixture list, as pure functions.
 *
 * Every day here is a Paris calendar day, keyed "YYYY-MM-DD". A fixture at
 * 23:30 in Paris is 21:30 or 22:30 UTC — still the same day — but one at 00:30
 * would land on the previous day if keyed in UTC, which is exactly the kind of
 * off-by-one a member notices in a calendar.
 */

const TIME_ZONE = 'Europe/Paris'

/**
 * What a member needs to know about one fixture at a glance on the calendar.
 *
 * - `TO_PREDICT`: still open, no bet yet — the only actionable state.
 * - `PENDING`: bet placed (or betting closed) and no score yet.
 * - `EXACT`, `OUTCOME`, `WRONG`: scored +3, +1 and 0. A fixture that closed
 *   without a bet and has a result counts as `WRONG`: it earned 0 like one.
 */
export const FixtureStatus = {
  ToPredict: 'TO_PREDICT',
  Pending: 'PENDING',
  Exact: 'EXACT',
  Outcome: 'OUTCOME',
  Wrong: 'WRONG',
} as const

export type FixtureStatus = (typeof FixtureStatus)[keyof typeof FixtureStatus]

export type CalendarFixture = {
  playedAt: Date
  locksAt: Date
  resultEnteredAt: Date | null
  homeScore: number | null
  awayScore: number | null
  prediction: { score: { points: number } | null } | null
}

export function fixtureStatus(match: CalendarFixture, now: Date): FixtureStatus {
  const state = lockState(match, now)
  const { prediction } = match

  if (!state.locked) {
    return prediction ? FixtureStatus.Pending : FixtureStatus.ToPredict
  }

  const hasResult = match.homeScore !== null && match.awayScore !== null
  if (!hasResult) return FixtureStatus.Pending
  if (!prediction) return FixtureStatus.Wrong

  // Scoring runs right after the result is saved; until it has, the member's
  // points are unknown rather than zero.
  if (!prediction.score) return FixtureStatus.Pending
  if (prediction.score.points >= POINTS_EXACT_SCORE) return FixtureStatus.Exact
  if (prediction.score.points >= POINTS_CORRECT_OUTCOME) return FixtureStatus.Outcome

  return FixtureStatus.Wrong
}

/**
 * The one status a day is painted with when it holds several fixtures.
 *
 * Actionable first: a day with one fixture still to predict must look like it
 * needs attention, whatever happened to the others played that day.
 */
const STATUS_PRIORITY: readonly FixtureStatus[] = [
  FixtureStatus.ToPredict,
  FixtureStatus.Pending,
  FixtureStatus.Wrong,
  FixtureStatus.Outcome,
  FixtureStatus.Exact,
]

export function dayStatus(statuses: readonly FixtureStatus[]): FixtureStatus | null {
  return STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? null
}

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "2026-11-15" — the Paris calendar day an instant falls on. */
export function parisDayKey(date: Date): string {
  return dayKeyFormatter.format(date)
}

/** A month, with `month` 1-based to match day keys ("2026-11" is `{ 2026, 11 }`). */
export type CalendarMonth = { year: number; month: number }

export function monthOfDayKey(dayKey: string): CalendarMonth {
  const [year, month] = dayKey.split('-').map(Number) as [number, number]
  return { year, month }
}

export function addMonths({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function compareMonths(a: CalendarMonth, b: CalendarMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month)
}

/**
 * The cells of a month grid, Monday first, as day keys.
 *
 * Leading `null`s pad the first week up to the month's first weekday, and
 * trailing ones complete the last week, so the result always splits into rows
 * of seven. Built from UTC arithmetic on the month itself — no instant, so no
 * time zone to get wrong.
 */
export function buildMonthGrid({ year, month }: CalendarMonth): (string | null)[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  // getUTCDay is Sunday = 0; shift so Monday = 0.
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7

  const cells: (string | null)[] = Array.from({ length: leading }, () => null)
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${prefix}-${String(day).padStart(2, '0')}`)
  }

  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

/**
 * Noon UTC on a day key — an instant that is that same calendar day in Paris
 * whatever the season, for handing to the Paris-pinned date formatters.
 */
export function dayKeyToDate(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day, 12))
}

/**
 * The day the calendar opens on: the next fixture still to be played, else the
 * most recent one — a member opening the calendar wants what's coming, and at
 * the end of the season, what just happened.
 */
export function initialDayKey(
  fixtures: readonly { playedAt: Date }[],
  now: Date,
): string {
  const upcoming = fixtures
    .filter((fixture) => fixture.playedAt.getTime() >= now.getTime())
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime())[0]

  if (upcoming) return parisDayKey(upcoming.playedAt)

  const latest = [...fixtures].sort(
    (a, b) => b.playedAt.getTime() - a.playedAt.getTime(),
  )[0]

  return parisDayKey(latest?.playedAt ?? now)
}
