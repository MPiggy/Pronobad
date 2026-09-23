import { describe, expect, it } from 'vitest'
import { teamIdFromLogoFile, teamLogoUrl } from './logo'

describe('teamLogoUrl', () => {
  it('is null for a team without a logo', () => {
    expect(teamLogoUrl({ id: 'abc', logo: null })).toBeNull()
  })

  it('versions the URL with the upload time, and round-trips the id', () => {
    const url = teamLogoUrl({ id: 'cm123abc', logo: { updatedAt: new Date(1_700_000_000_000) } })

    expect(url).toBe('/team-logos/cm123abc.webp?v=1700000000000')

    const file = url!.split('/').at(-1)!.split('?')[0]!
    expect(teamIdFromLogoFile(file)).toBe('cm123abc')
  })
})

describe('teamIdFromLogoFile', () => {
  it('rejects anything but <id>.webp', () => {
    expect(teamIdFromLogoFile('cm123abc')).toBeNull()
    expect(teamIdFromLogoFile('cm123abc.png')).toBeNull()
    expect(teamIdFromLogoFile('.webp')).toBeNull()
    expect(teamIdFromLogoFile('..%2Fx.webp')).toBeNull()
  })
})
