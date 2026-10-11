import { describe, expect, it } from 'vitest'
import { formatINR, formatPercent, parseRupeesToPaise } from './money'

describe('parseRupeesToPaise', () => {
  it('reads a whole number of rupees', () => {
    expect(parseRupeesToPaise('1250')).toEqual({ ok: true, paise: 125000 })
  })

  it('accepts commas and spaces, because people paste amounts off a bill', () => {
    expect(parseRupeesToPaise('1,250.50')).toEqual({ ok: true, paise: 125050 })
    expect(parseRupeesToPaise(' 1 250.50 ')).toEqual({ ok: true, paise: 125050 })
  })

  it('pads a single decimal on the right: 0.5 is 50 paise, not 5', () => {
    expect(parseRupeesToPaise('0.5')).toEqual({ ok: true, paise: 50 })
  })

  it('keeps full precision where parseFloat would not', () => {
    // parseFloat('1250.50') * 100 is 125049.99999999999.
    expect(parseRupeesToPaise('1250.50')).toEqual({ ok: true, paise: 125050 })
    expect(parseRupeesToPaise('0.07')).toEqual({ ok: true, paise: 7 })
  })

  it('rejects a negative amount', () => {
    expect(parseRupeesToPaise('-5')).toEqual({ ok: false, reason: 'negative' })
  })

  it('rejects more than 2 decimal places', () => {
    expect(parseRupeesToPaise('1.234')).toEqual({
      ok: false,
      reason: 'too_many_decimals',
    })
  })

  it('rejects text that is not a number', () => {
    expect(parseRupeesToPaise('abc')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseRupeesToPaise('12.3.4')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('reports an empty box separately, so the message can say "required"', () => {
    expect(parseRupeesToPaise('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseRupeesToPaise('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('accepts zero, leaving the "more than zero" rule to validation', () => {
    expect(parseRupeesToPaise('0')).toEqual({ ok: true, paise: 0 })
  })

  it('refuses a number too big to hold exactly', () => {
    expect(parseRupeesToPaise('999999999999999999')).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })
})

describe('formatINR', () => {
  it('always shows two decimal places', () => {
    expect(formatINR(0)).toBe('₹0.00')
    expect(formatINR(5)).toBe('₹0.05')
    expect(formatINR(50)).toBe('₹0.50')
  })

  it('groups in the Indian style (2,2,3)', () => {
    expect(formatINR(125050)).toBe('₹1,250.50')
    expect(formatINR(10000000)).toBe('₹1,00,000.00')
    expect(formatINR(100000000)).toBe('₹10,00,000.00')
  })

  it('shows a negative amount with a leading minus', () => {
    expect(formatINR(-369578)).toBe('-₹3,695.78')
  })

  it('round-trips with the parser', () => {
    const parsed = parseRupeesToPaise('42,249.99')
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(formatINR(parsed.paise)).toBe('₹42,249.99')
    }
  })
})

describe('formatPercent', () => {
  it('prints basis points with two decimals', () => {
    expect(formatPercent(10000)).toBe('100.00%')
    expect(formatPercent(3333)).toBe('33.33%')
    expect(formatPercent(500)).toBe('5.00%')
    expect(formatPercent(250)).toBe('2.50%')
    expect(formatPercent(0)).toBe('0.00%')
  })
})
