import { describe, expect, it } from 'vitest'
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, nameField } from './name-field'

/**
 * Shared by onboarding and the profile, so what matters here is the trimming:
 * length is checked *after* the trim, which is what stops whitespace from
 * passing as a pseudo or padding a name's position in a sort.
 */

describe('nameField', () => {
  it('accepts an ordinary pseudo', () => {
    expect(nameField.parse('Valentin')).toBe('Valentin')
  })

  it('trims surrounding whitespace', () => {
    expect(nameField.parse('  Valentin  ')).toBe('Valentin')
  })

  it('rejects whitespace that is only long enough before trimming', () => {
    expect(nameField.safeParse('    ').success).toBe(false)
  })

  it('measures length after trimming, not before', () => {
    // One real character, padded out past the minimum.
    expect(nameField.safeParse(' V ').success).toBe(false)
  })

  it('accepts its own bounds and rejects just outside them', () => {
    expect(nameField.safeParse('A'.repeat(NAME_MIN_LENGTH)).success).toBe(true)
    expect(nameField.safeParse('A'.repeat(NAME_MAX_LENGTH)).success).toBe(true)
    expect(nameField.safeParse('A'.repeat(NAME_MIN_LENGTH - 1)).success).toBe(
      false,
    )
    expect(nameField.safeParse('A'.repeat(NAME_MAX_LENGTH + 1)).success).toBe(
      false,
    )
  })

  it('rejects an empty string', () => {
    expect(nameField.safeParse('').success).toBe(false)
  })
})
