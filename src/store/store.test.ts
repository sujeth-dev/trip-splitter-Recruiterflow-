import { describe, expect, it } from 'vitest'
import { SAMPLE_TRIP_DATA } from '../data/sampleTripData'
import type { Expense, TripData } from '../domain/types'
import { expenseAdded, expenseDeleted } from './expensesSlice'
import { connectPersistence, makeStore } from './index'
import { STORAGE_KEY, type SimpleStorage } from './persistence'
import {
  filterByCategory,
  selectBalances,
  selectExpensesNewestFirst,
  selectLargestAbsoluteBalance,
  selectTotalPaise,
  sumAmounts,
} from './selectors'

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'x1',
    description: 'Chai',
    amount: 5000,
    paidBy: 'm1',
    date: '2026-03-12',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2'] },
    ...overrides,
  }
}

const TWO_MEMBER_TRIP: TripData = {
  members: [
    { id: 'm1', name: 'Aarav' },
    { id: 'm2', name: 'Diya' },
  ],
  expenses: [],
}

describe('the expenses reducer', () => {
  it('adds an expense', () => {
    const store = makeStore(TWO_MEMBER_TRIP)
    store.dispatch(expenseAdded(expense({ id: 'e1' })))

    expect(store.getState().expenses).toHaveLength(1)
    expect(store.getState().expenses[0].id).toBe('e1')
  })

  it('deletes an expense by id, leaving the others alone', () => {
    const store = makeStore({
      ...TWO_MEMBER_TRIP,
      expenses: [expense({ id: 'e1' }), expense({ id: 'e2' }), expense({ id: 'e3' })],
    })

    store.dispatch(expenseDeleted('e2'))

    expect(store.getState().expenses.map((item) => item.id)).toEqual(['e1', 'e3'])
  })

  it('does nothing when the id is not there', () => {
    const store = makeStore({ ...TWO_MEMBER_TRIP, expenses: [expense({ id: 'e1' })] })
    store.dispatch(expenseDeleted('nope'))

    expect(store.getState().expenses).toHaveLength(1)
  })

  it('never changes the members', () => {
    const store = makeStore(TWO_MEMBER_TRIP)
    const before = store.getState().members

    store.dispatch(expenseAdded(expense({ id: 'e1' })))

    expect(store.getState().members).toBe(before)
  })
})

describe('selectExpensesNewestFirst', () => {
  it('puts the newest date at the top', () => {
    const store = makeStore({
      ...TWO_MEMBER_TRIP,
      expenses: [
        expense({ id: 'old', date: '2026-03-10' }),
        expense({ id: 'new', date: '2026-03-14' }),
        expense({ id: 'middle', date: '2026-03-12' }),
      ],
    })

    expect(selectExpensesNewestFirst(store.getState()).map((item) => item.id)).toEqual([
      'new',
      'middle',
      'old',
    ])
  })

  it('shows the most recently added first when two share a date', () => {
    const store = makeStore({
      ...TWO_MEMBER_TRIP,
      expenses: [expense({ id: 'first', date: '2026-03-12' })],
    })

    store.dispatch(expenseAdded(expense({ id: 'second', date: '2026-03-12' })))

    expect(selectExpensesNewestFirst(store.getState()).map((item) => item.id)).toEqual([
      'second',
      'first',
    ])
  })

  it('leaves the stored array untouched', () => {
    const store = makeStore({
      ...TWO_MEMBER_TRIP,
      expenses: [expense({ id: 'a', date: '2026-03-10' }), expense({ id: 'b', date: '2026-03-14' })],
    })

    selectExpensesNewestFirst(store.getState())

    expect(store.getState().expenses.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('returns the identical array when nothing changed, so React can skip work', () => {
    const store = makeStore(TWO_MEMBER_TRIP)

    expect(selectExpensesNewestFirst(store.getState())).toBe(
      selectExpensesNewestFirst(store.getState()),
    )
  })
})

describe('balance and total selectors', () => {
  it('reads the acceptance balances straight from a store of sample data', () => {
    const store = makeStore(SAMPLE_TRIP_DATA)

    expect(Object.fromEntries(selectBalances(store.getState()))).toEqual({
      m1: 1855420,
      m2: -369578,
      m3: 55408,
      m4: -811250,
      m5: -730000,
    })
  })

  it('totals every expense', () => {
    const store = makeStore(SAMPLE_TRIP_DATA)

    expect(selectTotalPaise(store.getState())).toBe(4224999)
  })

  it('finds the biggest balance for scaling the bars', () => {
    const store = makeStore(SAMPLE_TRIP_DATA)

    expect(selectLargestAbsoluteBalance(store.getState())).toBe(1855420)
  })

  it('updates the balances as soon as an expense is deleted', () => {
    const store = makeStore(SAMPLE_TRIP_DATA)

    store.dispatch(expenseDeleted('e5')) // Groceries, ₹1,000 paid by Meera

    const balances = selectBalances(store.getState())
    expect(balances.get('m4')).toBe(-811250 - 100000)
    expect(balances.get('m1')).toBe(1855420 + 33334)

    let total = 0
    for (const paise of balances.values()) {
      total += paise
    }
    expect(total).toBe(0)
  })
})

describe('filtering and totalling a filtered list', () => {
  it('returns everything when no category is chosen', () => {
    expect(filterByCategory(SAMPLE_TRIP_DATA.expenses, null)).toHaveLength(6)
  })

  it('keeps only the chosen category', () => {
    const food = filterByCategory(SAMPLE_TRIP_DATA.expenses, 'Food')

    expect(food.map((item) => item.id)).toEqual(['e2', 'e5'])
    expect(sumAmounts(food)).toBe(425000)
  })

  it('is empty for a category with no expenses', () => {
    expect(filterByCategory(SAMPLE_TRIP_DATA.expenses, 'Other')).toEqual([])
    expect(sumAmounts([])).toBe(0)
  })
})

describe('the persistence subscription', () => {
  function makeFakeStorage() {
    const contents: Record<string, string> = {}
    const storage: SimpleStorage = {
      getItem: (key) => (Object.hasOwn(contents, key) ? contents[key] : null),
      setItem: (key, value) => {
        contents[key] = value
      },
    }
    return { contents, storage }
  }

  it('saves after an expense is added', () => {
    const { contents, storage } = makeFakeStorage()
    const store = makeStore(TWO_MEMBER_TRIP)
    connectPersistence(store, storage)

    store.dispatch(expenseAdded(expense({ id: 'e1' })))

    expect(JSON.parse(contents[STORAGE_KEY])).toEqual({
      members: TWO_MEMBER_TRIP.members,
      expenses: [expense({ id: 'e1' })],
    })
  })

  it('saves after an expense is deleted', () => {
    const { contents, storage } = makeFakeStorage()
    const store = makeStore({ ...TWO_MEMBER_TRIP, expenses: [expense({ id: 'e1' })] })
    connectPersistence(store, storage)

    store.dispatch(expenseDeleted('e1'))

    expect(JSON.parse(contents[STORAGE_KEY])).toEqual({
      members: TWO_MEMBER_TRIP.members,
      expenses: [],
    })
  })

  it('does not write when the dispatch changed nothing', () => {
    const { contents, storage } = makeFakeStorage()
    const store = makeStore(TWO_MEMBER_TRIP)
    connectPersistence(store, storage)

    store.dispatch(expenseDeleted('does-not-exist'))

    expect(Object.hasOwn(contents, STORAGE_KEY)).toBe(false)
  })

  it('stops writing once it is disconnected', () => {
    const { contents, storage } = makeFakeStorage()
    const store = makeStore(TWO_MEMBER_TRIP)
    const disconnect = connectPersistence(store, storage)

    disconnect()
    store.dispatch(expenseAdded(expense({ id: 'e1' })))

    expect(Object.hasOwn(contents, STORAGE_KEY)).toBe(false)
  })
})
