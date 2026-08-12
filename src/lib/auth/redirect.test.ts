import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './redirect'

describe('safeRedirectPath', () => {
  it('keeps in-app paths, including query strings', () => {
    expect(safeRedirectPath('/fixtures')).toBe('/fixtures')
    expect(safeRedirectPath('/leaderboard?season=2026')).toBe(
      '/leaderboard?season=2026',
    )
  })

  it('falls back when there is no value', () => {
    expect(safeRedirectPath(null)).toBe('/fixtures')
    expect(safeRedirectPath(undefined)).toBe('/fixtures')
    expect(safeRedirectPath('')).toBe('/fixtures')
  })

  it('rejects absolute URLs pointing off-site', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/fixtures')
    expect(safeRedirectPath('http://evil.example/path')).toBe('/fixtures')
  })

  // The interesting cases: these start with a slash and so look relative, but
  // browsers resolve them to a different origin.
  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.example')).toBe('/fixtures')
    expect(safeRedirectPath('//evil.example/fixtures')).toBe('/fixtures')
  })

  it('rejects backslash-prefixed URLs', () => {
    expect(safeRedirectPath('/\\evil.example')).toBe('/fixtures')
  })

  it('honours an explicit fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/login')).toBe('/login')
  })
})
