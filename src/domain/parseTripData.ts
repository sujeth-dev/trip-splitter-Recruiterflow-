import { isISODate } from './dates'
import { CATEGORIES, type Category, type Expense, type Member, type Split, type TripData } from './types'

/**
 * Turns data of completely unknown shape into a TripData, or null.
 *
 * Anything that arrives from outside the program -- localStorage, an imported
 * JSON file -- is `unknown` as far as correctness goes. TypeScript only
 * describes values it compiled; it cannot promise what a user pasted into
 * devtools yesterday. So instead of asserting a shape with `as`, every field
 * is checked at runtime. If a single thing is wrong the whole document is
 * rejected, because half-trusted data is worse than none.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readField(source: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(source, key)) {
    return undefined
  }
  return source[key]
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = readField(source, key)
  if (typeof value !== 'string' || value === '') {
    return null
  }
  return value
}

/** Money is only ever a whole number of paise, so a float or a string is wrong. */
function readPositivePaise(source: Record<string, unknown>, key: string): number | null {
  const value = readField(source, key)
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return null
  }
  return value
}

/** Narrows a plain string to the Category union by finding it in the list. */
function readCategory(source: Record<string, unknown>): Category | null {
  const value = readField(source, 'category')
  if (typeof value !== 'string') {
    return null
  }

  for (const category of CATEGORIES) {
    if (category === value) {
      return category
    }
  }

  return null
}

function parseMember(value: unknown): Member | null {
  if (!isObject(value)) {
    return null
  }

  const id = readString(value, 'id')
  const name = readString(value, 'name')

  if (id === null || name === null) {
    return null
  }

  return { id, name }
}

function parseMembers(value: unknown): Member[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const members: Member[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    const member = parseMember(entry)
    if (member === null || seen.has(member.id)) {
      return null
    }
    seen.add(member.id)
    members.push(member)
  }

  return members
}

/** A shares record: every key must be a known member and every value a number. */
function parseShares(
  value: unknown,
  knownMemberIds: Set<string>,
  isValidAmount: (amount: number) => boolean,
): Record<string, number> | null {
  if (!isObject(value)) {
    return null
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    return null
  }

  const shares: Record<string, number> = {}

  for (const [memberId, amount] of entries) {
    if (!knownMemberIds.has(memberId)) {
      return null
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !isValidAmount(amount)) {
      return null
    }
    shares[memberId] = amount
  }

  return shares
}

function sumRecord(shares: Record<string, number>): number {
  let total = 0
  for (const amount of Object.values(shares)) {
    total += amount
  }
  return total
}

function parseSplit(value: unknown, amount: number, knownMemberIds: Set<string>): Split | null {
  if (!isObject(value)) {
    return null
  }

  const type = readField(value, 'type')

  if (type === 'equal') {
    const memberIds = readField(value, 'memberIds')
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return null
    }

    const ids: string[] = []
    for (const memberId of memberIds) {
      if (typeof memberId !== 'string' || !knownMemberIds.has(memberId) || ids.includes(memberId)) {
        return null
      }
      ids.push(memberId)
    }

    return { type: 'equal', memberIds: ids }
  }

  if (type === 'exact') {
    const shares = parseShares(
      readField(value, 'shares'),
      knownMemberIds,
      (paise) => Number.isSafeInteger(paise) && paise >= 0,
    )
    if (shares === null) {
      return null
    }
    // Exact shares are used without rounding, so if they do not add up the
    // "balances always sum to zero" promise would quietly break.
    if (sumRecord(shares) !== amount) {
      return null
    }
    return { type: 'exact', shares }
  }

  if (type === 'percent') {
    const shares = parseShares(
      readField(value, 'shares'),
      knownMemberIds,
      (percent) => percent >= 0 && percent <= 100,
    )
    if (shares === null) {
      return null
    }
    // Compared in basis points, the same integers the maths uses later.
    let basisPoints = 0
    for (const percent of Object.values(shares)) {
      basisPoints += Math.round(percent * 100)
    }
    if (basisPoints !== 10000) {
      return null
    }
    return { type: 'percent', shares }
  }

  return null
}

function parseExpense(value: unknown, knownMemberIds: Set<string>): Expense | null {
  if (!isObject(value)) {
    return null
  }

  const id = readString(value, 'id')
  const description = readString(value, 'description')
  const paidBy = readString(value, 'paidBy')
  const date = readString(value, 'date')
  const amount = readPositivePaise(value, 'amount')
  const category = readCategory(value)

  if (id === null || description === null || paidBy === null || date === null) {
    return null
  }
  if (amount === null || category === null) {
    return null
  }
  if (!isISODate(date) || !knownMemberIds.has(paidBy)) {
    return null
  }

  const split = parseSplit(readField(value, 'split'), amount, knownMemberIds)
  if (split === null) {
    return null
  }

  return { id, description, amount, paidBy, date, category, split }
}

export function parseTripData(value: unknown): TripData | null {
  if (!isObject(value)) {
    return null
  }

  const members = parseMembers(readField(value, 'members'))
  if (members === null) {
    return null
  }

  const rawExpenses = readField(value, 'expenses')
  if (!Array.isArray(rawExpenses)) {
    return null
  }

  const knownMemberIds = new Set(members.map((member) => member.id))
  const expenses: Expense[] = []
  const seen = new Set<string>()

  for (const entry of rawExpenses) {
    const expense = parseExpense(entry, knownMemberIds)
    if (expense === null || seen.has(expense.id)) {
      return null
    }
    seen.add(expense.id)
    expenses.push(expense)
  }

  return { members, expenses }
}
