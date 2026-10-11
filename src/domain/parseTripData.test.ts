import { describe, expect, it } from 'vitest'
import { SAMPLE_TRIP_DATA } from '../data/sampleTripData'
import { computeBalances } from './balances'
import { parseTripData } from './parseTripData'

// A known-good document, copied and broken in one way per test.
function validTrip(): unknown {
  return {
    members: [
      { id: 'm1', name: 'Aarav' },
      { id: 'm2', name: 'Diya' },
    ],
    expenses: [
      {
        id: 'e1',
        description: 'Chai',
        amount: 5000,
        paidBy: 'm1',
        date: '2026-03-12',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m1', 'm2'] },
      },
    ],
  }
}

function withExpense(split: unknown, amount = 5000): unknown {
  return {
    members: [
      { id: 'm1', name: 'Aarav' },
      { id: 'm2', name: 'Diya' },
    ],
    expenses: [
      {
        id: 'e1',
        description: 'Chai',
        amount,
        paidBy: 'm1',
        date: '2026-03-12',
        category: 'Food',
        split,
      },
    ],
  }
}

describe('parseTripData: accepting good data', () => {
  it('accepts a well formed trip', () => {
    expect(parseTripData(validTrip())).toEqual(validTrip())
  })

  it('accepts a trip with no expenses yet', () => {
    expect(parseTripData({ members: [{ id: 'm1', name: 'Aarav' }], expenses: [] })).toEqual({
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [],
    })
  })

  it('accepts exact shares that add up to the amount', () => {
    expect(parseTripData(withExpense({ type: 'exact', shares: { m1: 2000, m2: 3000 } }))).not.toBeNull()
  })

  it('accepts percentages that add up to exactly 100', () => {
    expect(
      parseTripData(withExpense({ type: 'percent', shares: { m1: 33.33, m2: 66.67 } })),
    ).not.toBeNull()
  })
})

describe('parseTripData: rejecting bad data', () => {
  it('rejects things that are not objects', () => {
    expect(parseTripData(null)).toBeNull()
    expect(parseTripData(undefined)).toBeNull()
    expect(parseTripData('a string')).toBeNull()
    expect(parseTripData(42)).toBeNull()
    expect(parseTripData([])).toBeNull()
  })

  it('rejects a missing or empty member list', () => {
    expect(parseTripData({ expenses: [] })).toBeNull()
    expect(parseTripData({ members: [], expenses: [] })).toBeNull()
    expect(parseTripData({ members: 'nope', expenses: [] })).toBeNull()
  })

  it('rejects duplicate member ids', () => {
    expect(
      parseTripData({
        members: [
          { id: 'm1', name: 'Aarav' },
          { id: 'm1', name: 'Copy' },
        ],
        expenses: [],
      }),
    ).toBeNull()
  })

  it('rejects an amount that is a string, not paise', () => {
    const broken = {
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [
        {
          id: 'e1',
          description: 'Chai',
          amount: '12',
          paidBy: 'm1',
          date: '2026-03-12',
          category: 'Food',
          split: { type: 'equal', memberIds: ['m1'] },
        },
      ],
    }

    expect(parseTripData(broken)).toBeNull()
  })

  it('rejects an amount that is not a whole number of paise', () => {
    expect(parseTripData(withExpense({ type: 'equal', memberIds: ['m1'] }, 50.5))).toBeNull()
  })

  it('rejects a zero or negative amount', () => {
    expect(parseTripData(withExpense({ type: 'equal', memberIds: ['m1'] }, 0))).toBeNull()
    expect(parseTripData(withExpense({ type: 'equal', memberIds: ['m1'] }, -100))).toBeNull()
  })

  it('rejects a missing field', () => {
    const trip = {
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [
        {
          id: 'e1',
          amount: 5000,
          paidBy: 'm1',
          date: '2026-03-12',
          category: 'Food',
          split: { type: 'equal', memberIds: ['m1'] },
        },
      ],
    }

    expect(parseTripData(trip)).toBeNull()
  })

  it('rejects an unknown split type', () => {
    expect(parseTripData(withExpense({ type: 'shares', memberIds: ['m1'] }))).toBeNull()
    expect(parseTripData(withExpense({ memberIds: ['m1'] }))).toBeNull()
  })

  it('rejects an unknown category', () => {
    const trip = {
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [
        {
          id: 'e1',
          description: 'Chai',
          amount: 5000,
          paidBy: 'm1',
          date: '2026-03-12',
          category: 'Shopping',
          split: { type: 'equal', memberIds: ['m1'] },
        },
      ],
    }

    expect(parseTripData(trip)).toBeNull()
  })

  it('rejects a date that is not a real calendar day', () => {
    const trip = {
      members: [{ id: 'm1', name: 'Aarav' }],
      expenses: [
        {
          id: 'e1',
          description: 'Chai',
          amount: 5000,
          paidBy: 'm1',
          date: '2026-02-30',
          category: 'Food',
          split: { type: 'equal', memberIds: ['m1'] },
        },
      ],
    }

    expect(parseTripData(trip)).toBeNull()
  })

  it('rejects a payer or split member who is not on the trip', () => {
    expect(parseTripData(withExpense({ type: 'equal', memberIds: ['m9'] }))).toBeNull()
    expect(parseTripData(withExpense({ type: 'exact', shares: { m9: 5000 } }))).toBeNull()
  })

  it('rejects exact shares that do not add up to the amount', () => {
    expect(parseTripData(withExpense({ type: 'exact', shares: { m1: 2000, m2: 2000 } }))).toBeNull()
  })

  it('rejects percentages that do not add up to 100', () => {
    expect(parseTripData(withExpense({ type: 'percent', shares: { m1: 50, m2: 49 } }))).toBeNull()
  })

  it('rejects an empty split', () => {
    expect(parseTripData(withExpense({ type: 'equal', memberIds: [] }))).toBeNull()
    expect(parseTripData(withExpense({ type: 'exact', shares: {} }))).toBeNull()
  })
})

describe('the bundled sample data', () => {
  it('passes the same parser used on saved data', () => {
    expect(SAMPLE_TRIP_DATA.members).toHaveLength(5)
    expect(SAMPLE_TRIP_DATA.expenses).toHaveLength(6)
  })

  it('produces the balances from the acceptance table', () => {
    const balances = computeBalances(SAMPLE_TRIP_DATA.members, SAMPLE_TRIP_DATA.expenses)

    expect(Object.fromEntries(balances)).toEqual({
      m1: 1855420,
      m2: -369578,
      m3: 55408,
      m4: -811250,
      m5: -730000,
    })
  })

  it('totals ₹42,249.99', () => {
    const total = SAMPLE_TRIP_DATA.expenses.reduce((sum, expense) => sum + expense.amount, 0)

    expect(total).toBe(4224999)
  })
})
