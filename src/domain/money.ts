// Every amount in this app is an integer number of paise.
//
// Why: 0.1 + 0.2 is 0.30000000000000004 in floating point, so rupees-as-floats
// quietly lose and invent paise. Integers can't. Rupees only exist as the
// string the user types and the string we print.

// A result type instead of throwing or returning NaN: the caller must look at
// `ok` before it can reach `paise`, so an unhandled parse failure is a compile
// error rather than a silent NaN spreading through the maths.
export type ParseMoneyResult =
  | { ok: true; paise: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'too_many_decimals' }

// Digits with an optional single dot, optionally signed. Also allows '.5'
// and '5.' so a half-typed amount gives a precise message, not 'invalid'.
const NUMERIC_SHAPE = /^-?(\d+(\.\d*)?|\.\d+)$/

/**
 * Turns what the user typed into integer paise.
 *
 * It reads the string character by character instead of doing
 * `parseFloat(text) * 100`, because that multiplication is exactly the
 * floating-point step we are trying to avoid: parseFloat('1250.50') * 100
 * is 125049.99999999999, which Math.round would hide today and get wrong
 * on some other value tomorrow.
 */
export function parseRupeesToPaise(input: string): ParseMoneyResult {
  // People paste amounts like '1,250.50' or ' 1 250.50 ' from a bill.
  const cleaned = input.replace(/[\s,]/g, '')

  if (cleaned === '') {
    return { ok: false, reason: 'empty' }
  }

  if (!NUMERIC_SHAPE.test(cleaned)) {
    return { ok: false, reason: 'invalid' }
  }

  // Checked before the decimal count so that any numeric-looking negative
  // ('-5', '-1.234') reports the same thing: it is below zero.
  if (cleaned.startsWith('-')) {
    return { ok: false, reason: 'negative' }
  }

  const dotIndex = cleaned.indexOf('.')
  const wholeText = dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex)
  const fractionText = dotIndex === -1 ? '' : cleaned.slice(dotIndex + 1)

  // '1.5' means 50 paise, not 5. Pad on the right, never the left.
  if (fractionText.length > 2) {
    return { ok: false, reason: 'too_many_decimals' }
  }

  const wholeRupees = wholeText === '' ? 0 : Number(wholeText)
  const paiseText = fractionText.padEnd(2, '0')
  const paise = wholeRupees * 100 + Number(paiseText)

  // A 20-digit input parses without complaint but can no longer be held
  // exactly, which would break the "never lose a paisa" promise downstream.
  if (!Number.isSafeInteger(paise)) {
    return { ok: false, reason: 'invalid' }
  }

  return { ok: true, paise }
}

// Grouping is Indian (2,2,3): 1,00,000 rather than 100,000.
const INDIAN_GROUPING = new Intl.NumberFormat('en-IN', { useGrouping: true })

/**
 * Prints paise as '₹1,00,000.00'.
 *
 * Only the whole-rupee part goes through Intl; the paise are padded by hand.
 * Handing Intl a float like 100000.005 would let it round for us, and its
 * rounding is not the rule this app promises.
 */
export function formatINR(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const absolute = Math.abs(paise)
  const rupees = Math.floor(absolute / 100)
  const remainder = absolute % 100

  return `${sign}₹${INDIAN_GROUPING.format(rupees)}.${String(remainder).padStart(2, '0')}`
}

/**
 * Prints basis points as a percentage with 2 decimals: 3333 -> '33.33'.
 * Same trick as formatINR: integer division, no float ever formed.
 */
export function formatPercent(basisPoints: number): string {
  const sign = basisPoints < 0 ? '-' : ''
  const absolute = Math.abs(basisPoints)
  const whole = Math.floor(absolute / 100)
  const remainder = absolute % 100

  return `${sign}${whole}.${String(remainder).padStart(2, '0')}%`
}
