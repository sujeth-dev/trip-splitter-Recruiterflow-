import { describe, expect, it } from 'vitest'
import { allocateByWeights, computeShares, describeSplit } from './split'
import type { Expense } from './types'

const MEMBER_ORDER = ['m1', 'm2', 'm3', 'm4', 'm5']

function sumOf(shares: Map<string, number>): number {
  let total = 0
  for (const share of shares.values()) {
    total += share
  }
  return total
}

function expenseWith(overrides: Partial<Expense>): Expense {
  return {
    id: 'test',
    description: 'Test',
    amount: 100000,
    paidBy: 'm1',
    date: '2026-03-14',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
    ...overrides,
  }
}

describe('allocateByWeights', () => {
  it('gives the leftover paise out in member order', () => {
    const weights = new Map([
      ['m1', 1],
      ['m2', 1],
      ['m3', 1],
    ])
    const shares = allocateByWeights(100000, weights, MEMBER_ORDER)

    expect(shares.get('m1')).toBe(33334)
    expect(shares.get('m2')).toBe(33333)
    expect(shares.get('m3')).toBe(33333)
    expect(sumOf(shares)).toBe(100000)
  })

  it('never hands a stray paisa to someone with no weight', () => {
    const weights = new Map([
      ['m1', 1],
      ['m2', 1],
      ['m3', 0],
      ['m4', 1],
    ])
    const shares = allocateByWeights(100, weights, MEMBER_ORDER)

    expect(shares.get('m3')).toBe(0)
    expect(sumOf(shares)).toBe(100)
  })

  it('returns zeros when no one carries any weight', () => {
    const shares = allocateByWeights(5000, new Map([['m1', 0]]), MEMBER_ORDER)

    expect(shares.get('m1')).toBe(0)
  })
})

describe('computeShares', () => {
  it('splits 100 rupees three ways as 33.34 + 33.33 + 33.33', () => {
    const shares = computeShares(expenseWith({}), MEMBER_ORDER)

    expect(Object.fromEntries(shares)).toEqual({ m1: 33334, m2: 33333, m3: 33333 })
  })

  it('handles the 33.33 / 33.33 / 33.34 per cent cab fare', () => {
    const expense = expenseWith({
      amount: 149999,
      split: { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } },
    })

    expect(Object.fromEntries(computeShares(expense, MEMBER_ORDER))).toEqual({
      m1: 49995,
      m2: 49995,
      m3: 50009,
    })
  })

  it('passes exact amounts straight through, untouched', () => {
    const expense = expenseWith({
      amount: 1050000,
      split: { type: 'exact', shares: { m3: 350000, m4: 350000, m5: 350000 } },
    })

    expect(Object.fromEntries(computeShares(expense, MEMBER_ORDER))).toEqual({
      m3: 350000,
      m4: 350000,
      m5: 350000,
    })
  })

  it('leaves the payer out of the split when they are not in it', () => {
    const expense = expenseWith({
      amount: 90000,
      paidBy: 'm5',
      split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
    })
    const shares = computeShares(expense, MEMBER_ORDER)

    expect(shares.has('m5')).toBe(false)
    expect(sumOf(shares)).toBe(90000)
  })

  it('gives a 0 per cent member nothing', () => {
    const expense = expenseWith({
      amount: 100001,
      split: { type: 'percent', shares: { m1: 50, m2: 50, m3: 0 } },
    })
    const shares = computeShares(expense, MEMBER_ORDER)

    expect(shares.get('m3')).toBe(0)
    expect(sumOf(shares)).toBe(100001)
  })

  it('always adds up to the amount, for many awkward amounts', () => {
    for (let amount = 1; amount <= 500; amount += 1) {
      const equal = computeShares(
        expenseWith({ amount, split: { type: 'equal', memberIds: MEMBER_ORDER } }),
        MEMBER_ORDER,
      )
      expect(sumOf(equal)).toBe(amount)

      const percent = computeShares(
        expenseWith({
          amount,
          split: { type: 'percent', shares: { m1: 16.67, m2: 33.33, m3: 50 } },
        }),
        MEMBER_ORDER,
      )
      expect(sumOf(percent)).toBe(amount)
    }
  })
})

describe('describeSplit', () => {
  it('reads the way the Split column should', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4'] })).toBe(
      'Equally, 4 people',
    )
    expect(describeSplit({ type: 'exact', shares: { m3: 1, m4: 1, m5: 1 } })).toBe(
      'Exact amounts, 3 people',
    )
    expect(describeSplit({ type: 'percent', shares: { m1: 50, m2: 50 } })).toBe(
      'Percentages, 2 people',
    )
  })

  it('says "person" when the split covers one member', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['m1'] })).toBe('Equally, 1 person')
  })
})
