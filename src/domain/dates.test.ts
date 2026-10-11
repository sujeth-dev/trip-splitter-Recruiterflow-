import { describe, expect, it } from 'vitest'
import { formatShortDate, isISODate, todayLocalISO } from './dates'

describe('isISODate', () => {
  it('accepts a real calendar day', () => {
    expect(isISODate('2026-03-15')).toBe(true)
    expect(isISODate('2024-02-29')).toBe(true) // leap year
  })

  it('rejects anything that is not a real day', () => {
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('2026-13-01')).toBe(false)
    expect(isISODate('2025-02-29')).toBe(false) // not a leap year
    expect(isISODate('15-03-2026')).toBe(false)
    expect(isISODate('2026-3-5')).toBe(false)
    expect(isISODate('')).toBe(false)
  })
})

describe('todayLocalISO', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 1 Jan 2026 at 02:00 local time. toISOString() on this date would say
    // 2025-12-31 for anyone east of UTC, which is the bug we are avoiding.
    const localNewYear = new Date(2026, 0, 1, 2, 0, 0)
    expect(todayLocalISO(localNewYear)).toBe('2026-01-01')
  })

  it('zero-pads single-digit months and days', () => {
    expect(todayLocalISO(new Date(2026, 2, 5))).toBe('2026-03-05')
  })
})

describe('formatShortDate', () => {
  it('prints the day and short month shown in the design', () => {
    expect(formatShortDate('2026-03-15')).toBe('15 Mar')
    expect(formatShortDate('2026-03-12')).toBe('12 Mar')
    expect(formatShortDate('2026-01-01')).toBe('1 Jan')
    expect(formatShortDate('2026-12-31')).toBe('31 Dec')
  })

  it('shows the raw value rather than invent a date', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date')
  })
})
