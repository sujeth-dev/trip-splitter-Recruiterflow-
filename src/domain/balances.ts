import { formatINR } from './money'
import { computeShares } from './split'
import type { Expense, Member } from './types'

/**
 * What each member is owed (positive) or owes (negative), in paise.
 *
 *   balance = everything they paid - their share of every expense
 *
 * The payer does not have to be in the split: paying is recorded separately
 * from owing, so buying lunch for other people simply leaves you in credit.
 *
 * Because every expense's shares add up to its amount exactly, every rupee
 * added as "paid" is removed again as "owed", so the balances always sum to 0.
 */
export function computeBalances(members: Member[], expenses: Expense[]): Map<string, number> {
  const memberOrder = members.map((member) => member.id)

  const balances = new Map<string, number>()
  for (const memberId of memberOrder) {
    balances.set(memberId, 0)
  }

  for (const expense of expenses) {
    const payerBalance = balances.get(expense.paidBy)
    if (payerBalance !== undefined) {
      balances.set(expense.paidBy, payerBalance + expense.amount)
    }

    for (const [memberId, share] of computeShares(expense, memberOrder)) {
      const current = balances.get(memberId)
      if (current === undefined) {
        continue
      }
      balances.set(memberId, current - share)
    }
  }

  return balances
}

export type BalanceDescription = {
  kind: 'gets-back' | 'owes' | 'settled'
  label: string
  /** Formatted absolute amount, or null when there is nothing to show. */
  amount: string | null
  /** The whole sentence, for screen readers and tests. */
  text: string
}

/** Turns a signed balance into the exact wording the brief asks for. */
export function describeBalance(paise: number): BalanceDescription {
  if (paise > 0) {
    const amount = formatINR(paise)
    return { kind: 'gets-back', label: 'gets back', amount, text: `gets back ${amount}` }
  }

  if (paise < 0) {
    // The minus sign is already carried by the word "owes", so show the
    // absolute value: "owes ₹3,695.78", never "owes -₹3,695.78".
    const amount = formatINR(Math.abs(paise))
    return { kind: 'owes', label: 'owes', amount, text: `owes ${amount}` }
  }

  return { kind: 'settled', label: 'settled up', amount: null, text: 'settled up' }
}

/** The biggest absolute balance, used to scale the bars on the tickets. */
export function largestAbsoluteBalance(balances: Map<string, number>): number {
  let largest = 0
  for (const paise of balances.values()) {
    const size = Math.abs(paise)
    if (size > largest) {
      largest = size
    }
  }
  return largest
}
