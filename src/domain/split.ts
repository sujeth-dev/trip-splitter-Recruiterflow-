import { assertNever, type Expense, type Split } from './types'

/**
 * The paisa rule, written once and used everywhere.
 *
 * Shares are first rounded DOWN to whole paise. The leftover paise (always
 * fewer than the number of people) are handed out one at a time, in the order
 * of the trip's member list, skipping anyone whose share is 0.
 *
 * Rounding down first and then handing out the remainder is what guarantees
 * the shares add up to the amount exactly: nothing is lost and nothing is
 * invented. Rounding each share to the nearest paisa independently would not.
 *
 * All maths is on integers. The largest product we ever form is
 * amount x weight, at most 10^8 paise x 10^4 basis points = 10^12, comfortably
 * inside Number.MAX_SAFE_INTEGER (about 9 x 10^15), so no precision is lost.
 */
export function allocateByWeights(
  amountPaise: number,
  weights: Map<string, number>,
  memberOrder: string[],
): Map<string, number> {
  const shares = new Map<string, number>()

  let totalWeight = 0
  for (const weight of weights.values()) {
    totalWeight += weight
  }

  // Nobody carries any weight, so nobody owes anything. Returning zeros keeps
  // the caller's "every participant has a share" assumption true.
  if (totalWeight <= 0) {
    for (const memberId of weights.keys()) {
      shares.set(memberId, 0)
    }
    return shares
  }

  let allocated = 0
  for (const [memberId, weight] of weights) {
    const share = Math.floor((amountPaise * weight) / totalWeight)
    shares.set(memberId, share)
    allocated += share
  }

  let leftover = amountPaise - allocated

  for (const memberId of memberOrder) {
    if (leftover <= 0) {
      break
    }

    const weight = weights.get(memberId)
    // Someone outside this split, or in it with zero weight, is skipped:
    // a person on a 0% share should not be handed a stray paisa.
    if (weight === undefined || weight === 0) {
      continue
    }

    const current = shares.get(memberId)
    if (current === undefined) {
      continue
    }

    shares.set(memberId, current + 1)
    leftover -= 1
  }

  return shares
}

/**
 * What each member owes for one expense, in paise.
 * The values always add up to `expense.amount` exactly.
 */
export function computeShares(expense: Expense, memberOrder: string[]): Map<string, number> {
  const split = expense.split

  switch (split.type) {
    case 'equal': {
      // Everyone in the split carries the same weight.
      const weights = new Map<string, number>()
      for (const memberId of memberOrder) {
        if (split.memberIds.includes(memberId)) {
          weights.set(memberId, 1)
        }
      }
      return allocateByWeights(expense.amount, weights, memberOrder)
    }

    case 'percent': {
      // Percentages become integer basis points (33.33 -> 3333) before any
      // maths, so "adds up to 100" is an exact integer comparison against
      // 10000 rather than a floating-point one.
      const weights = new Map<string, number>()
      for (const memberId of memberOrder) {
        if (!Object.hasOwn(split.shares, memberId)) {
          continue
        }
        weights.set(memberId, Math.round(split.shares[memberId] * 100))
      }
      return allocateByWeights(expense.amount, weights, memberOrder)
    }

    case 'exact': {
      // The user already gave whole paise, so there is nothing to round.
      const shares = new Map<string, number>()
      for (const memberId of memberOrder) {
        if (!Object.hasOwn(split.shares, memberId)) {
          continue
        }
        shares.set(memberId, split.shares[memberId])
      }
      return shares
    }

    default:
      return assertNever(split)
  }
}

/** How many people a split covers. */
export function countSplitMembers(split: Split): number {
  switch (split.type) {
    case 'equal':
      return split.memberIds.length
    case 'exact':
    case 'percent':
      return Object.keys(split.shares).length
    default:
      return assertNever(split)
  }
}

const SPLIT_LABELS = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
}

/** The Split column text: 'Equally, 4 people'. */
export function describeSplit(split: Split): string {
  const count = countSplitMembers(split)
  const noun = count === 1 ? 'person' : 'people'

  return `${SPLIT_LABELS[split.type]}, ${count} ${noun}`
}

/** Lower-case form used inside the delete dialog sentence. */
export function describeSplitMethod(split: Split): string {
  switch (split.type) {
    case 'equal':
      return 'equally'
    case 'exact':
      return 'by exact amounts'
    case 'percent':
      return 'by percentages'
    default:
      return assertNever(split)
  }
}
