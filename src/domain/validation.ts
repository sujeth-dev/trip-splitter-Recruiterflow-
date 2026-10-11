import { isISODate } from './dates'
import { formatINR, formatPercent, parseRupeesToPaise } from './money'
import { CATEGORIES, type Category, type Member, type NewExpense, type Split } from './types'

export type SplitType = 'equal' | 'exact' | 'percent'

/**
 * The form's state. Every field is a string because that is literally what an
 * <input> holds; converting on every keystroke would fight the user while they
 * type (you could never clear the box, or type '1.' on the way to '1.5').
 * Conversion happens once, here, when they press Save.
 */
export type ExpenseDraft = {
  description: string
  amount: string
  paidBy: string
  date: string
  category: string
  splitType: SplitType
  selectedMemberIds: string[]
  exactShares: Record<string, string>
  percentShares: Record<string, string>
}

export type DraftErrors = {
  description?: string
  amount?: string
  paidBy?: string
  date?: string
  category?: string
  /** The group-level split message, shown under the member inputs. */
  split?: string
  /** Per-member messages, keyed by member id. */
  shares?: Record<string, string>
}

export type ValidationResult =
  | { ok: true; expense: NewExpense }
  | { ok: false; errors: DraftErrors }

export const MAX_DESCRIPTION_LENGTH = 60

/** Ten lakh rupees, expressed the only way this app stores money: in paise. */
export const MAX_AMOUNT_PAISE = 100000000

const PERCENT_TOTAL_BASIS_POINTS = 10000

export function makeEmptyDraft(members: Member[], today: string): ExpenseDraft {
  const exactShares: Record<string, string> = {}
  const percentShares: Record<string, string> = {}
  for (const member of members) {
    exactShares[member.id] = ''
    percentShares[member.id] = ''
  }

  return {
    description: '',
    amount: '',
    paidBy: '',
    date: today,
    category: '',
    splitType: 'equal',
    // Splitting between everyone is the common case, so it is the starting point.
    selectedMemberIds: members.map((member) => member.id),
    exactShares,
    percentShares,
  }
}

function isCategory(value: string): value is Category {
  // `includes` on a readonly tuple of literals will not accept a plain string,
  // so the list is widened first. This is the runtime half of the type guard.
  const names: readonly string[] = CATEGORIES
  return names.includes(value)
}

type ShareBox = { ok: true; value: number } | { ok: false; reason: string }

/** Reads one member's box. An empty box means zero, not an error. */
function readShareBox(raw: string): ShareBox {
  if (raw.trim() === '') {
    return { ok: true, value: 0 }
  }

  const parsed = parseRupeesToPaise(raw)
  if (parsed.ok) {
    return { ok: true, value: parsed.paise }
  }

  return { ok: false, reason: parsed.reason }
}

function readRecord(record: Record<string, string>, key: string): string {
  if (!Object.hasOwn(record, key)) {
    return ''
  }
  return record[key]
}

function sumValues(values: Map<string, number>): number {
  let total = 0
  for (const value of values.values()) {
    total += value
  }
  return total
}

/** Live total of the exact-amount boxes, in paise. Unreadable boxes count as 0. */
export function sumExactShares(draft: ExpenseDraft, members: Member[]): number {
  let total = 0
  for (const member of members) {
    const box = readShareBox(readRecord(draft.exactShares, member.id))
    if (box.ok) {
      total += box.value
    }
  }
  return total
}

/**
 * Live total of the percentage boxes, in basis points.
 *
 * parseRupeesToPaise is reused on purpose: "a number with at most two decimal
 * places, scaled by 100" is exactly the same job, so 33.33 per cent becomes
 * 3333 basis points just as ₹33.33 becomes 3333 paise. One parser, one set of
 * rules, one place to fix a bug.
 */
export function sumPercentShares(draft: ExpenseDraft, members: Member[]): number {
  let total = 0
  for (const member of members) {
    const box = readShareBox(readRecord(draft.percentShares, member.id))
    if (box.ok) {
      total += box.value
    }
  }
  return total
}

function validateDescription(value: string): string | undefined {
  const trimmed = value.trim()

  if (trimmed === '') {
    return 'Description is required'
  }

  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
  }

  return undefined
}

type AmountOutcome = { paise: number | null; error: string | undefined }

function validateAmount(value: string): AmountOutcome {
  const parsed = parseRupeesToPaise(value)

  if (!parsed.ok) {
    switch (parsed.reason) {
      case 'empty':
        return { paise: null, error: 'Amount is required' }
      case 'negative':
        return { paise: null, error: 'Amount must be more than ₹0' }
      case 'too_many_decimals':
        return { paise: null, error: 'Use at most 2 decimal places' }
      case 'invalid':
        return { paise: null, error: 'Enter an amount like 1250.50' }
    }
  }

  // Zero and negatives are the same mistake to the person filling the form,
  // so they get the same sentence.
  if (parsed.paise === 0) {
    return { paise: null, error: 'Amount must be more than ₹0' }
  }

  if (parsed.paise > MAX_AMOUNT_PAISE) {
    return { paise: null, error: `Amount can be at most ${formatINR(MAX_AMOUNT_PAISE)}` }
  }

  return { paise: parsed.paise, error: undefined }
}

function validateDate(value: string, today: string): string | undefined {
  if (value.trim() === '' || !isISODate(value)) {
    return 'Date is required'
  }

  // 'YYYY-MM-DD' strings sort in the same order as the dates themselves, so
  // comparing the strings is correct and needs no Date, and so no timezone.
  if (value > today) {
    return "Date can't be in the future"
  }

  return undefined
}

type SplitOutcome = {
  split: Split | null
  splitError: string | undefined
  shareErrors: Record<string, string>
}

function validateEqualSplit(draft: ExpenseDraft, members: Member[]): SplitOutcome {
  // Filtering the member list (rather than using the draft's own array) stores
  // the ids in trip order, which is the order the paisa rule hands out
  // leftovers in. Saved data then reads the same way it behaves.
  const memberIds = members
    .map((member) => member.id)
    .filter((memberId) => draft.selectedMemberIds.includes(memberId))

  if (memberIds.length === 0) {
    return {
      split: null,
      splitError: 'Choose at least one person to split with',
      shareErrors: {},
    }
  }

  return { split: { type: 'equal', memberIds }, splitError: undefined, shareErrors: {} }
}

function validateExactSplit(
  draft: ExpenseDraft,
  members: Member[],
  amountPaise: number | null,
): SplitOutcome {
  const shareErrors: Record<string, string> = {}
  const values = new Map<string, number>()

  for (const member of members) {
    const box = readShareBox(readRecord(draft.exactShares, member.id))

    if (!box.ok) {
      if (box.reason === 'negative') {
        shareErrors[member.id] = "Can't be negative"
      } else if (box.reason === 'too_many_decimals') {
        shareErrors[member.id] = 'Use at most 2 decimal places'
      } else {
        shareErrors[member.id] = 'Enter an amount like 250.00'
      }
      continue
    }

    values.set(member.id, box.value)
  }

  // A box that cannot be read makes the total meaningless, so the per-box
  // messages are shown on their own first.
  if (Object.keys(shareErrors).length > 0) {
    return { split: null, splitError: undefined, shareErrors }
  }

  // Without a valid amount there is nothing to compare the total against, and
  // the amount field already carries its own error.
  if (amountPaise === null) {
    return { split: null, splitError: undefined, shareErrors }
  }

  const difference = amountPaise - sumValues(values)

  if (difference > 0) {
    return { split: null, splitError: `${formatINR(difference)} left to assign`, shareErrors }
  }

  if (difference < 0) {
    return { split: null, splitError: `${formatINR(-difference)} over`, shareErrors }
  }

  return {
    split: { type: 'exact', shares: onlyNonZero(values) },
    splitError: undefined,
    shareErrors,
  }
}

function validatePercentSplit(draft: ExpenseDraft, members: Member[]): SplitOutcome {
  const shareErrors: Record<string, string> = {}
  const basisPoints = new Map<string, number>()

  for (const member of members) {
    const box = readShareBox(readRecord(draft.percentShares, member.id))

    if (!box.ok) {
      if (box.reason === 'too_many_decimals') {
        shareErrors[member.id] = 'Use at most 2 decimal places'
      } else {
        shareErrors[member.id] = 'Must be between 0 and 100'
      }
      continue
    }

    if (box.value > PERCENT_TOTAL_BASIS_POINTS) {
      shareErrors[member.id] = 'Must be between 0 and 100'
      continue
    }

    basisPoints.set(member.id, box.value)
  }

  if (Object.keys(shareErrors).length > 0) {
    return { split: null, splitError: undefined, shareErrors }
  }

  // Integers on both sides, so "exactly 100 per cent" is an exact comparison.
  const difference = PERCENT_TOTAL_BASIS_POINTS - sumValues(basisPoints)

  if (difference > 0) {
    return { split: null, splitError: `${formatPercent(difference)} left to assign`, shareErrors }
  }

  if (difference < 0) {
    return { split: null, splitError: `${formatPercent(-difference)} over`, shareErrors }
  }

  // Stored back as a percentage (3333 -> 33.33) to match the saved data
  // format. Every calculation converts it to basis points again first.
  const percents = new Map<string, number>()
  for (const [memberId, points] of basisPoints) {
    percents.set(memberId, points / 100)
  }

  return {
    split: { type: 'percent', shares: onlyNonZero(percents) },
    splitError: undefined,
    shareErrors,
  }
}

/** Members on 0 are not really part of the split, so they are not stored. */
function onlyNonZero(values: Map<string, number>): Record<string, number> {
  const shares: Record<string, number> = {}

  for (const [memberId, value] of values) {
    if (value !== 0) {
      shares[memberId] = value
    }
  }

  return shares
}

function validateSplit(
  draft: ExpenseDraft,
  members: Member[],
  amountPaise: number | null,
): SplitOutcome {
  switch (draft.splitType) {
    case 'equal':
      return validateEqualSplit(draft, members)
    case 'exact':
      return validateExactSplit(draft, members, amountPaise)
    case 'percent':
      return validatePercentSplit(draft, members)
  }
}

/**
 * The single source of truth for "is this form valid, and what does it mean?".
 *
 * It is a plain function: no React, no store, no clock. `today` is handed in
 * so a test can pin it and never go stale. The form and the tests therefore
 * agree by construction rather than by careful copying.
 */
export function validateExpenseDraft(
  draft: ExpenseDraft,
  members: Member[],
  today: string,
): ValidationResult {
  const errors: DraftErrors = {}

  const descriptionError = validateDescription(draft.description)
  if (descriptionError !== undefined) {
    errors.description = descriptionError
  }

  const amount = validateAmount(draft.amount)
  if (amount.error !== undefined) {
    errors.amount = amount.error
  }

  const payer = members.find((member) => member.id === draft.paidBy)
  if (payer === undefined) {
    errors.paidBy = 'Choose who paid'
  }

  const categoryIsValid = isCategory(draft.category)
  if (!categoryIsValid) {
    errors.category = 'Choose a category'
  }

  const dateError = validateDate(draft.date, today)
  if (dateError !== undefined) {
    errors.date = dateError
  }

  const splitOutcome = validateSplit(draft, members, amount.paise)
  if (splitOutcome.splitError !== undefined) {
    errors.split = splitOutcome.splitError
  }
  if (Object.keys(splitOutcome.shareErrors).length > 0) {
    errors.shares = splitOutcome.shareErrors
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  // Re-checking each piece here (instead of trusting that an empty `errors`
  // implies they are all set) is what lets TypeScript narrow them away from
  // null for the object below, with no `!` and no cast.
  if (
    amount.paise === null ||
    payer === undefined ||
    splitOutcome.split === null ||
    !isCategory(draft.category)
  ) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    expense: {
      description: draft.description.trim(),
      amount: amount.paise,
      paidBy: payer.id,
      date: draft.date,
      category: draft.category,
      split: splitOutcome.split,
    },
  }
}

// Form order, so the summary reads top to bottom the way the page does.
const FIELD_LABELS: { key: keyof DraftErrors; label: string }[] = [
  { key: 'description', label: 'description' },
  { key: 'amount', label: 'amount' },
  { key: 'date', label: 'date' },
  { key: 'paidBy', label: 'paid by' },
  { key: 'category', label: 'category' },
  { key: 'split', label: 'split' },
  { key: 'shares', label: 'split' },
]

/** The names of the fields that failed, for the summary at the top of the form. */
export function listErrorFields(errors: DraftErrors): string[] {
  const labels: string[] = []

  for (const field of FIELD_LABELS) {
    if (errors[field.key] === undefined) {
      continue
    }
    // 'split' and 'shares' are two halves of one visible section, so the
    // reader should only be sent there once.
    if (labels.includes(field.label)) {
      continue
    }
    labels.push(field.label)
  }

  return labels
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) {
    return items.join('')
  }

  const head = items.slice(0, -1)
  const tail = items[items.length - 1]

  return `${head.join(', ')} and ${tail}`
}

/** 'Fix 3 fields to save this expense: description, date and split.' */
export function summariseErrors(errors: DraftErrors): string {
  const fields = listErrorFields(errors)
  const noun = fields.length === 1 ? 'field' : 'fields'

  return `Fix ${fields.length} ${noun} to save this expense: ${joinWithAnd(fields)}.`
}
