import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthGrid,
  type CalendarFixture,
  compareMonths,
  dayStatus,
  fixtureStatus,
  FixtureStatus,
  initialDayKey,
  parisDayKey,
} from './calendar'

const now = new Date('2026-11-10T12:00:00Z')

function fixture(overrides: Partial<CalendarFixture> = {}): CalendarFixture {
  return {
    playedAt: new Date('2026-11-15T18:00:00Z'),
    locksAt: new Date('2026-11-15T18:00:00Z'),
    resultEnteredAt: null,
    homeScore: null,
    awayScore: null,
    prediction: null,
    ...overrides,
  }
}

const played = {
  playedAt: new Date('2026-11-01T18:00:00Z'),
  locksAt: new Date('2026-11-01T18:00:00Z'),
  resultEnteredAt: new Date('2026-11-01T22:00:00Z'),
  homeScore: 5,
  awayScore: 3,
}

describe('fixtureStatus', () => {
  it('is to predict when open without a bet', () => {
    expect(fixtureStatus(fixture(), now)).toBe(FixtureStatus.ToPredict)
  })

  it('is pending when open with a bet', () => {
    expect(
      fixtureStatus(fixture({ prediction: { score: null } }), now),
    ).toBe(FixtureStatus.Pending)
  })

  it('is pending when closed without a result', () => {
    const closed = fixture({ locksAt: new Date('2026-11-09T18:00:00Z') })
    expect(fixtureStatus(closed, now)).toBe(FixtureStatus.Pending)
  })

  it('is pending while a result is in but not scored yet', () => {
    expect(
      fixtureStatus(fixture({ ...played, prediction: { score: null } }), now),
    ).toBe(FixtureStatus.Pending)
  })

  it.each([
    [3, FixtureStatus.Exact],
    [1, FixtureStatus.Outcome],
    [0, FixtureStatus.Wrong],
  ])('maps %i points to %s', (points, expected) => {
    expect(
      fixtureStatus(fixture({ ...played, prediction: { score: { points } } }), now),
    ).toBe(expected)
  })

  it('counts a played fixture without a bet as wrong', () => {
    expect(fixtureStatus(fixture(played), now)).toBe(FixtureStatus.Wrong)
  })
})

describe('dayStatus', () => {
  it('puts the actionable status first', () => {
    expect(
      dayStatus([FixtureStatus.Exact, FixtureStatus.ToPredict, FixtureStatus.Wrong]),
    ).toBe(FixtureStatus.ToPredict)
  })

  it('is null for a day without fixtures', () => {
    expect(dayStatus([])).toBeNull()
  })
})

describe('parisDayKey', () => {
  it('keys a late-evening fixture on its Paris day, not the UTC one', () => {
    // 00:30 in Paris (CET) is still the previous day in UTC.
    expect(parisDayKey(new Date('2026-11-14T23:30:00Z'))).toBe('2026-11-15')
  })
})

describe('buildMonthGrid', () => {
  it('starts on Monday and pads to full weeks', () => {
    // November 2026 starts on a Sunday.
    const grid = buildMonthGrid({ year: 2026, month: 11 })

    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(grid.length % 7).toBe(0)
    expect(grid.filter(Boolean)).toHaveLength(30)
  })

  it('handles leap-year February', () => {
    const grid = buildMonthGrid({ year: 2028, month: 2 })
    expect(grid.filter(Boolean).at(-1)).toBe('2028-02-29')
  })
})

describe('month arithmetic', () => {
  it('rolls over years both ways', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 })
  })

  it('orders months', () => {
    expect(compareMonths({ year: 2026, month: 12 }, { year: 2027, month: 1 })).toBeLessThan(0)
  })
})

describe('initialDayKey', () => {
  it('opens on the next fixture', () => {
    const fixtures = [
      { playedAt: new Date('2026-11-01T18:00:00Z') },
      { playedAt: new Date('2026-12-06T18:00:00Z') },
      { playedAt: new Date('2026-11-15T18:00:00Z') },
    ]
    expect(initialDayKey(fixtures, now)).toBe('2026-11-15')
  })

  it('falls back to the most recent fixture once the season is over', () => {
    const fixtures = [
      { playedAt: new Date('2026-10-01T18:00:00Z') },
      { playedAt: new Date('2026-11-01T18:00:00Z') },
    ]
    expect(initialDayKey(fixtures, now)).toBe('2026-11-01')
  })

  it('falls back to today without fixtures', () => {
    expect(initialDayKey([], now)).toBe('2026-11-10')
  })
})
