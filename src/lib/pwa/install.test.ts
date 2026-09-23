import { describe, expect, it } from 'vitest'
import { INSTALL_SNOOZE_MS, isInstallSnoozed, isIosDevice } from './install'

const now = new Date('2026-11-10T12:00:00Z').getTime()

describe('isInstallSnoozed', () => {
  it('shows the banner when it was never dismissed', () => {
    expect(isInstallSnoozed(null, now)).toBe(false)
  })

  it('hides the banner just after a dismissal', () => {
    expect(isInstallSnoozed(now - 1000, now)).toBe(true)
  })

  it('brings the banner back once the snooze has elapsed', () => {
    expect(isInstallSnoozed(now - INSTALL_SNOOZE_MS, now)).toBe(false)
    expect(isInstallSnoozed(now - INSTALL_SNOOZE_MS + 1, now)).toBe(true)
  })

  it('ignores a timestamp in the future rather than snoozing for ever', () => {
    expect(isInstallSnoozed(now + INSTALL_SNOOZE_MS, now)).toBe(false)
  })

  it('ignores a corrupted stored value', () => {
    expect(isInstallSnoozed(Number.NaN, now)).toBe(false)
  })
})

describe('isIosDevice', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
  const mac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
  const android =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

  it('detects an iPhone', () => {
    expect(isIosDevice(iphone, 5)).toBe(true)
  })

  it('detects an iPad behind its desktop user agent', () => {
    // iPadOS 13+ sends the Mac user agent; only the touch points give it away.
    expect(isIosDevice(mac, 5)).toBe(true)
  })

  it('does not mistake a Mac for an iPad', () => {
    expect(isIosDevice(mac, 0)).toBe(false)
  })

  it('leaves Android to the native install prompt', () => {
    expect(isIosDevice(android, 5)).toBe(false)
  })
})
