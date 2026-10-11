import { createSelector } from '@reduxjs/toolkit'
import { computeBalances, largestAbsoluteBalance } from '../domain/balances'
import type { Category, Expense } from '../domain/types'
import type { RootState } from './index'

/**
 * Everything on screen that is not simply "the members" or "the expenses" is
 * worked out here rather than stored.
 *
 * Derived state that is also stored can disagree with the thing it came from;
 * derived state that is computed cannot. createSelector caches the last
 * result, so a page that re-renders for an unrelated reason does not
 * recalculate every balance.
 */

export const selectMembers = (state: RootState) => state.members
export const selectExpenses = (state: RootState) => state.expenses

/** Newest date first; same-date expenses show the most recently added first. */
export const selectExpensesNewestFirst = createSelector([selectExpenses], (expenses) => {
  // The position in the store is the order they were added, so it is the
  // tie-breaker. Sorting a copy keeps the store's own array untouched.
  const positions = expenses.map((expense, position) => ({ expense, position }))

  positions.sort((left, right) => {
    if (left.expense.date !== right.expense.date) {
      // 'YYYY-MM-DD' strings compare in date order, so no Date is needed.
      return left.expense.date < right.expense.date ? 1 : -1
    }
    return right.position - left.position
  })

  return positions.map((entry) => entry.expense)
})

export const selectBalances = createSelector(
  [selectMembers, selectExpenses],
  (members, expenses) => computeBalances(members, expenses),
)

export const selectLargestAbsoluteBalance = createSelector([selectBalances], (balances) =>
  largestAbsoluteBalance(balances),
)

export const selectTotalPaise = createSelector([selectExpenses], (expenses) =>
  sumAmounts(expenses),
)

/** Adds up a list of expenses, in paise. */
export function sumAmounts(expenses: Expense[]): number {
  let total = 0
  for (const expense of expenses) {
    total += expense.amount
  }
  return total
}

/** 'All' is not a Category, so the filter is a Category or null. */
export function filterByCategory(expenses: Expense[], category: Category | null): Expense[] {
  if (category === null) {
    return expenses
  }
  return expenses.filter((expense) => expense.category === category)
}
