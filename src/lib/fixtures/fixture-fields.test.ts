import { describe, expect, it } from 'vitest'
import { parseFixtureFields } from './fixture-fields'

function form(entries: Record<string, string | undefined>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) data.set(key, value)
  }
  return data
}

const valid = {
  homeTeamId: 'home',
  awayTeamId: 'away',
  round: '3',
  playedAt: '2026-11-15T18:00',
  locksAtKickoff: 'on',
}

describe('parseFixtureFields', () => {
  it('reads the date as Paris wall-clock time', () => {
    const result = parseFixtureFields(form(valid))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // 18:00 CET is 17:00 UTC.
    expect(result.fixture.playedAt.toISOString()).toBe('2026-11-15T17:00:00.000Z')
  })

  it('ties the deadline to kickoff when the box is ticked, ignoring any posted deadline', () => {
    const result = parseFixtureFields(
      form({ ...valid, locksAt: '2026-11-14T20:00' }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.fixture.locksAt.getTime()).toBe(result.fixture.playedAt.getTime())
  })

  it('uses the posted deadline when the box is unticked', () => {
    const result = parseFixtureFields(
      form({ ...valid, locksAtKickoff: undefined, locksAt: '2026-11-14T20:00' }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.fixture.locksAt.toISOString()).toBe('2026-11-14T19:00:00.000Z')
  })

  it('requires a deadline when the box is unticked', () => {
    const result = parseFixtureFields(
      form({ ...valid, locksAtKickoff: undefined, locksAt: '' }),
    )

    expect(result).toEqual({
      ok: false,
      message: 'Indiquez la fermeture des pronostics.',
    })
  })

  it('treats an empty rubber count as "follow the default"', () => {
    const result = parseFixtureFields(form({ ...valid, maxScore: '' }))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.fixture.maxScore).toBeNull()
  })

  it('keeps an explicit rubber count', () => {
    const result = parseFixtureFields(form({ ...valid, maxScore: '6' }))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.fixture.maxScore).toBe(6)
  })

  it('refuses a team playing itself', () => {
    const result = parseFixtureFields(form({ ...valid, awayTeamId: 'home' }))

    expect(result).toEqual({
      ok: false,
      message: 'Une équipe ne peut pas jouer contre elle-même.',
    })
  })

  it('reports the first missing field', () => {
    const result = parseFixtureFields(form({ ...valid, homeTeamId: '' }))

    expect(result).toEqual({
      ok: false,
      message: 'Choisissez l’équipe à domicile.',
    })
  })
})
