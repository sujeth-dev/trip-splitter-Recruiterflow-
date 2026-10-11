// Dates in this app are always the plain string 'YYYY-MM-DD'.
//
// Why a string and not a Date: a Date is a moment in time, so it carries a
// timezone. `new Date('2026-03-15')` is midnight UTC, which in India is
// already 05:30 on the 15th but in New York is still the 14th. An expense
// happened on a calendar day, not at an instant, so we keep the calendar day.

const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/

const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** True only for a real calendar day, so '2026-02-30' and '2026-13-01' fail. */
export function isISODate(value: string): boolean {
  if (!ISO_DATE_SHAPE.test(value)) {
    return false
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))

  if (month < 1 || month > 12 || day < 1) {
    return false
  }

  // Day 0 of the next month is the last day of this one, which handles
  // leap years without a table of month lengths.
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  return day <= lastDayOfMonth
}

/**
 * Today as 'YYYY-MM-DD' in the user's own timezone.
 * `toISOString()` would be wrong here: after 5:30am IST it still reports
 * yesterday's UTC date for part of the day.
 */
export function todayLocalISO(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** '2026-03-15' -> '15 Mar', read straight off the string so no timezone can shift it. */
export function formatShortDate(isoDate: string): string {
  if (!isISODate(isoDate)) {
    return isoDate // Show the raw value rather than invent a date.
  }

  const monthIndex = Number(isoDate.slice(5, 7)) - 1
  const day = Number(isoDate.slice(8, 10))

  return `${day} ${SHORT_MONTH_NAMES[monthIndex]}`
}
