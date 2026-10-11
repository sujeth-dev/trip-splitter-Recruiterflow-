import { describe, expect, it } from 'vitest'
import type { Member } from './types'
import {
  listErrorFields,
  makeEmptyDraft,
  summariseErrors,
  sumExactShares,
  sumPercentShares,
  validateExpenseDraft,
  type ExpenseDraft,
} from './validation'

const MEMBERS: Member[] = [
  { id: 'm1', name: 'Aarav' },
  { id: 'm2', name: 'Diya' },
  { id: 'm3', name: 'Kabir' },
  { id: 'm4', name: 'Meera' },
  { id: 'm5', name: 'Rohan' },
]

// Pinned so these tests say the same thing in a year's time.
const TODAY = '2026-03-15'

function draftWith(overrides: Partial<ExpenseDraft>): ExpenseDraft {
  return {
    description: 'Fish thali',
    amount: '1250.50',
    paidBy: 'm1',
    date: '2026-03-14',
    category: 'Food',
    splitType: 'equal',
    selectedMemberIds: ['m1', 'm2'],
    exactShares: { m1: '', m2: '', m3: '', m4: '', m5: '' },
    percentShares: { m1: '', m2: '', m3: '', m4: '', m5: '' },
    ...overrides,
  }
}

function errorsOf(draft: ExpenseDraft) {
  const result = validateExpenseDraft(draft, MEMBERS, TODAY)
  if (result.ok) {
    throw new Error('Expected the draft to be invalid')
  }
  return result.errors
}

describe('validateExpenseDraft: description', () => {
  it('requires a description', () => {
    expect(errorsOf(draftWith({ description: '   ' })).description).toBe(
      'Description is required',
    )
  })

  it('allows exactly 60 characters but not 61', () => {
    expect(validateExpenseDraft(draftWith({ description: 'a'.repeat(60) }), MEMBERS, TODAY).ok).toBe(
      true,
    )
    expect(errorsOf(draftWith({ description: 'a'.repeat(61) })).description).toBe(
      'Description must be 60 characters or fewer',
    )
  })
})

describe('validateExpenseDraft: amount', () => {
  it('requires an amount', () => {
    expect(errorsOf(draftWith({ amount: '' })).amount).toBe('Amount is required')
  })

  it('uses the same sentence for zero and for a negative amount', () => {
    expect(errorsOf(draftWith({ amount: '0' })).amount).toBe('Amount must be more than ₹0')
    expect(errorsOf(draftWith({ amount: '-5' })).amount).toBe('Amount must be more than ₹0')
    expect(errorsOf(draftWith({ amount: '0.00' })).amount).toBe('Amount must be more than ₹0')
  })

  it('caps the amount at ten lakh', () => {
    expect(validateExpenseDraft(draftWith({ amount: '1000000' }), MEMBERS, TODAY).ok).toBe(true)
    expect(errorsOf(draftWith({ amount: '1000000.01' })).amount).toBe(
      'Amount can be at most ₹10,00,000.00',
    )
  })

  it('rejects more than two decimal places', () => {
    expect(errorsOf(draftWith({ amount: '12.345' })).amount).toBe('Use at most 2 decimal places')
  })

  it('rejects something that is not a number', () => {
    expect(errorsOf(draftWith({ amount: 'free' })).amount).toBe('Enter an amount like 1250.50')
  })
})

describe('validateExpenseDraft: paid by, category and date', () => {
  it('requires a known payer', () => {
    expect(errorsOf(draftWith({ paidBy: '' })).paidBy).toBe('Choose who paid')
    expect(errorsOf(draftWith({ paidBy: 'nobody' })).paidBy).toBe('Choose who paid')
  })

  it('requires a category from the list', () => {
    expect(errorsOf(draftWith({ category: '' })).category).toBe('Choose a category')
    expect(errorsOf(draftWith({ category: 'Shopping' })).category).toBe('Choose a category')
  })

  it('requires a date', () => {
    expect(errorsOf(draftWith({ date: '' })).date).toBe('Date is required')
  })

  it('accepts today but not tomorrow', () => {
    expect(validateExpenseDraft(draftWith({ date: TODAY }), MEMBERS, TODAY).ok).toBe(true)
    expect(errorsOf(draftWith({ date: '2026-03-16' })).date).toBe("Date can't be in the future")
  })
})

describe('validateExpenseDraft: equal split', () => {
  it('needs at least one person', () => {
    expect(errorsOf(draftWith({ selectedMemberIds: [] })).split).toBe(
      'Choose at least one person to split with',
    )
  })

  it('stores the chosen ids in trip order, not click order', () => {
    const result = validateExpenseDraft(
      draftWith({ selectedMemberIds: ['m4', 'm1', 'm3'] }),
      MEMBERS,
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.expense.split).toEqual({ type: 'equal', memberIds: ['m1', 'm3', 'm4'] })
    }
  })
})

describe('validateExpenseDraft: exact split', () => {
  const exactDraft = (shares: Record<string, string>, amount = '1250.00') =>
    draftWith({ splitType: 'exact', amount, exactShares: shares })

  it('says how much is still left to assign', () => {
    const errors = errorsOf(
      exactDraft({ m1: '500.00', m2: '300.00', m3: '437.50', m4: '0', m5: '0' }),
    )

    expect(errors.split).toBe('₹12.50 left to assign')
  })

  it('says how much is over', () => {
    const errors = errorsOf(
      exactDraft({ m1: '500.00', m2: '400.00', m3: '355.00', m4: '0', m5: '0' }),
    )

    expect(errors.split).toBe('₹5.00 over')
  })

  it('reports a bad box next to that member, not as a total', () => {
    const errors = errorsOf(exactDraft({ m1: '-5', m2: '1.234', m3: 'abc', m4: '', m5: '' }))

    expect(errors.shares).toEqual({
      m1: "Can't be negative",
      m2: 'Use at most 2 decimal places',
      m3: 'Enter an amount like 250.00',
    })
    expect(errors.split).toBeUndefined()
  })

  it('accepts a split that adds up exactly, and stores only non-zero shares', () => {
    const result = validateExpenseDraft(
      exactDraft({ m1: '500.00', m2: '300.00', m3: '450.00', m4: '0', m5: '' }),
      MEMBERS,
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.expense.split).toEqual({
        type: 'exact',
        shares: { m1: 50000, m2: 30000, m3: 45000 },
      })
    }
  })
})

describe('validateExpenseDraft: percentage split', () => {
  const percentDraft = (shares: Record<string, string>) =>
    draftWith({ splitType: 'percent', percentShares: shares })

  it('says how much per cent is left to assign', () => {
    const errors = errorsOf(percentDraft({ m1: '33.33', m2: '33.33', m3: '28.34', m4: '', m5: '' }))

    expect(errors.split).toBe('5.00% left to assign')
  })

  it('says how much per cent is over', () => {
    const errors = errorsOf(percentDraft({ m1: '50', m2: '52.5', m3: '', m4: '', m5: '' }))

    expect(errors.split).toBe('2.50% over')
  })

  it('keeps each share between 0 and 100', () => {
    const errors = errorsOf(percentDraft({ m1: '120', m2: '-5', m3: '1.234', m4: '', m5: '' }))

    expect(errors.shares).toEqual({
      m1: 'Must be between 0 and 100',
      m2: 'Must be between 0 and 100',
      m3: 'Use at most 2 decimal places',
    })
  })

  it('accepts 33.33 / 33.33 / 33.34, which adds up to exactly 100', () => {
    const result = validateExpenseDraft(
      percentDraft({ m1: '33.33', m2: '33.33', m3: '33.34', m4: '0', m5: '' }),
      MEMBERS,
      TODAY,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.expense.split).toEqual({
        type: 'percent',
        shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
      })
    }
  })
})

describe('validateExpenseDraft: a valid draft', () => {
  it('produces the expense the store should hold', () => {
    const result = validateExpenseDraft(
      draftWith({
        description: '  Fish thali at Britto’s  ',
        amount: '1,250.50',
        paidBy: 'm3',
        date: '2026-03-14',
        category: 'Food',
        selectedMemberIds: ['m1', 'm2', 'm3'],
      }),
      MEMBERS,
      TODAY,
    )

    expect(result).toEqual({
      ok: true,
      expense: {
        description: 'Fish thali at Britto’s',
        amount: 125050,
        paidBy: 'm3',
        date: '2026-03-14',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
      },
    })
  })
})

describe('the error summary', () => {
  it('lists the broken fields in form order', () => {
    const errors = errorsOf(
      draftWith({ description: '', date: '2027-01-01', selectedMemberIds: [] }),
    )

    expect(listErrorFields(errors)).toEqual(['description', 'date', 'split'])
    expect(summariseErrors(errors)).toBe(
      'Fix 3 fields to save this expense: description, date and split.',
    )
  })

  it('uses the singular for a single field', () => {
    const errors = errorsOf(draftWith({ description: '' }))

    expect(summariseErrors(errors)).toBe('Fix 1 field to save this expense: description.')
  })

  it('counts the split section once even when both halves fail', () => {
    const errors = errorsOf(
      draftWith({ splitType: 'exact', amount: '100', exactShares: { m1: '-1' } }),
    )

    expect(listErrorFields(errors)).toEqual(['split'])
  })
})

describe('the live totals shown under the split boxes', () => {
  it('adds up the exact boxes in paise', () => {
    const draft = draftWith({
      splitType: 'exact',
      exactShares: { m1: '500.00', m2: '300', m3: '437.50', m4: '', m5: 'junk' },
    })

    expect(sumExactShares(draft, MEMBERS)).toBe(123750)
  })

  it('adds up the percentage boxes in basis points', () => {
    const draft = draftWith({
      splitType: 'percent',
      percentShares: { m1: '33.33', m2: '33.33', m3: '', m4: '', m5: '' },
    })

    expect(sumPercentShares(draft, MEMBERS)).toBe(6666)
  })
})

describe('makeEmptyDraft', () => {
  it('starts with everyone selected and today in the date box', () => {
    const draft = makeEmptyDraft(MEMBERS, TODAY)

    expect(draft.date).toBe(TODAY)
    expect(draft.splitType).toBe('equal')
    expect(draft.selectedMemberIds).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
    expect(draft.description).toBe('')
    expect(draft.amount).toBe('')
  })

  it('is not valid on its own, so an empty form cannot be saved', () => {
    expect(validateExpenseDraft(makeEmptyDraft(MEMBERS, TODAY), MEMBERS, TODAY).ok).toBe(false)
  })
})
