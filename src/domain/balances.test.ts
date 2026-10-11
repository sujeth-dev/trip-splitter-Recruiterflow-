import { describe, expect, it } from 'vitest'
import { computeBalances, describeBalance, largestAbsoluteBalance } from './balances'
import type { Expense, Member } from './types'

// The sample trip, written out as typed values so this test proves the real
// numbers rather than whatever a loosely typed JSON import happens to hold.
const MEMBERS: Member[] = [
  { id: 'm1', name: 'Aarav' },
  { id: 'm2', name: 'Diya' },
  { id: 'm3', name: 'Kabir' },
  { id: 'm4', name: 'Meera' },
  { id: 'm5', name: 'Rohan' },
]

const EXPENSES: Expense[] = [
  {
    id: 'e1',
    description: 'Villa booking',
    amount: 2400000,
    paidBy: 'm1',
    date: '2026-03-12',
    category: 'Stay',
    split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] },
  },
  {
    id: 'e2',
    description: 'Beach shack dinner',
    amount: 325000,
    paidBy: 'm2',
    date: '2026-03-12',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4'] },
  },
  {
    id: 'e3',
    description: 'Scuba diving',
    amount: 1050000,
    paidBy: 'm3',
    date: '2026-03-13',
    category: 'Activities',
    split: { type: 'exact', shares: { m3: 350000, m4: 350000, m5: 350000 } },
  },
  {
    id: 'e4',
    description: 'Scooter rental',
    amount: 200000,
    paidBy: 'm5',
    date: '2026-03-13',
    category: 'Travel',
    split: { type: 'percent', shares: { m5: 50, m1: 25, m2: 25 } },
  },
  {
    id: 'e5',
    description: 'Groceries',
    amount: 100000,
    paidBy: 'm4',
    date: '2026-03-14',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
  },
  {
    id: 'e6',
    description: 'Airport cab',
    amount: 149999,
    paidBy: 'm1',
    date: '2026-03-15',
    category: 'Travel',
    split: { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } },
  },
]

describe('computeBalances', () => {
  it('matches the acceptance table for the sample trip', () => {
    const balances = computeBalances(MEMBERS, EXPENSES)

    expect(Object.fromEntries(balances)).toEqual({
      m1: 1855420,
      m2: -369578,
      m3: 55408,
      m4: -811250,
      m5: -730000,
    })
  })

  it('always adds up to exactly zero', () => {
    let total = 0
    for (const paise of computeBalances(MEMBERS, EXPENSES).values()) {
      total += paise
    }

    expect(total).toBe(0)
  })

  it('gives everyone a zero balance when there are no expenses', () => {
    const balances = computeBalances(MEMBERS, [])

    expect(Object.fromEntries(balances)).toEqual({ m1: 0, m2: 0, m3: 0, m4: 0, m5: 0 })
  })

  it('leaves a payer who is not in the split fully in credit', () => {
    const balances = computeBalances(MEMBERS, [
      {
        id: 'x1',
        description: 'Treat',
        amount: 60000,
        paidBy: 'm5',
        date: '2026-03-14',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m1', 'm2'] },
      },
    ])

    expect(balances.get('m5')).toBe(60000)
    expect(balances.get('m1')).toBe(-30000)
    expect(balances.get('m2')).toBe(-30000)
  })

  it('settles to zero when the payer covers only their own share', () => {
    const balances = computeBalances(MEMBERS, [
      {
        id: 'x2',
        description: 'Own coffee',
        amount: 15000,
        paidBy: 'm3',
        date: '2026-03-14',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m3'] },
      },
    ])

    expect(balances.get('m3')).toBe(0)
  })
})

describe('describeBalance', () => {
  it('says "gets back" for a positive balance', () => {
    expect(describeBalance(1855420)).toEqual({
      kind: 'gets-back',
      label: 'gets back',
      amount: '₹18,554.20',
      text: 'gets back ₹18,554.20',
    })
  })

  it('says "owes" with the amount as a positive number', () => {
    expect(describeBalance(-369578)).toEqual({
      kind: 'owes',
      label: 'owes',
      amount: '₹3,695.78',
      text: 'owes ₹3,695.78',
    })
  })

  it('says "settled up" for zero', () => {
    expect(describeBalance(0)).toEqual({
      kind: 'settled',
      label: 'settled up',
      amount: null,
      text: 'settled up',
    })
  })
})

describe('largestAbsoluteBalance', () => {
  it('ignores the sign when finding the biggest balance', () => {
    const balances = computeBalances(MEMBERS, EXPENSES)

    expect(largestAbsoluteBalance(balances)).toBe(1855420)
  })

  it('is zero when everyone is settled', () => {
    expect(largestAbsoluteBalance(new Map([['m1', 0]]))).toBe(0)
  })
})
