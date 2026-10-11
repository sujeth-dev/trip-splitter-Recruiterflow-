// The shapes every other file agrees on. Pure types plus two tiny constants:
// no React, no Redux, nothing that touches the browser.

export type Member = {
  id: string
  name: string
}

// The list is the single source of truth and `Category` is derived from it,
// so adding a category here immediately updates the type, the <select> and
// the filter buttons. `as const` keeps the literal strings instead of widening
// them to `string`.
export const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Other'] as const

export type Category = (typeof CATEGORIES)[number]

// A discriminated union on `type`. Code that reads a split must `switch` on
// `split.type`, and inside each branch TypeScript knows exactly which other
// fields exist (`memberIds` only on equal, `shares` only on exact/percent).
export type EqualSplit = {
  type: 'equal'
  memberIds: string[]
}

export type ExactSplit = {
  type: 'exact'
  shares: Record<string, number> // paise per member
}

export type PercentSplit = {
  type: 'percent'
  shares: Record<string, number> // percent per member, e.g. 33.33
}

export type Split = EqualSplit | ExactSplit | PercentSplit

export type Expense = {
  id: string
  description: string
  amount: number // integer paise, never a float of rupees
  paidBy: string // member id
  date: string // 'YYYY-MM-DD'
  category: Category
  split: Split
}

// An expense before it has an id. The page creates the id, so the reducer
// stays a pure function of its input (see store/expensesSlice.ts).
export type NewExpense = Omit<Expense, 'id'>

export type TripData = {
  members: Member[]
  expenses: Expense[]
}

// Called in the `default` branch of an exhaustive switch. If a fourth split
// type is ever added, the value reaching here stops being `never` and this
// line becomes a compile error until the new branch is written.
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
