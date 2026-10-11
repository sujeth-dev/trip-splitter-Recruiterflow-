import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../App'
import { renderWithProviders } from '../test/renderWithProviders'

function renderForm() {
  return renderWithProviders(<AppRoutes />, { route: '/expenses/new' })
}

/** Fills in everything a valid expense needs, leaving the split as it is. */
async function fillValidBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Description'), 'Fish thali')
  await user.type(screen.getByLabelText('Amount'), '500')
  await user.selectOptions(screen.getByLabelText('Paid by'), 'm1')
  await user.selectOptions(screen.getByLabelText('Category'), 'Food')
}

describe('saving an invalid form', () => {
  it('shows an error next to every broken field and saves nothing', async () => {
    const user = userEvent.setup()
    const { store } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Choose who paid')).toBeInTheDocument()
    expect(screen.getByText('Choose a category')).toBeInTheDocument()

    // Nothing reached the store, and the page did not move on.
    expect(store.getState().expenses).toHaveLength(6)
    expect(screen.getByRole('heading', { name: 'Add to the bill' })).toBeInTheDocument()
  })

  it('links each message to its input for screen readers', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    const description = screen.getByLabelText('Description')
    expect(description).toHaveAttribute('aria-invalid', 'true')
    expect(description).toHaveAccessibleDescription('Description is required')
  })

  it('summarises the failures at the top and moves focus there', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent(
      'Fix 4 fields to save this expense: description, amount, paid by and category.',
    )
    expect(summary).toHaveFocus()
  })

  it('says exactly "Amount must be more than ₹0" for a negative amount', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '-250')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('Amount must be more than ₹0')).toBeInTheDocument()
  })

  it('rejects a description longer than 60 characters', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Description'), 'a'.repeat(61))
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('Description must be 60 characters or fewer')).toBeInTheDocument()
  })

  it('needs at least one person in an equal split', async () => {
    const user = userEvent.setup()
    renderForm()

    for (const name of ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan']) {
      await user.click(screen.getByRole('checkbox', { name }))
    }
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('Choose at least one person to split with')).toBeInTheDocument()
  })

  it('clears a message as soon as the field is fixed', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(screen.getByText('Description is required')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Description'), 'Fish thali')

    expect(screen.queryByText('Description is required')).not.toBeInTheDocument()
  })
})

describe('the exact amounts split', () => {
  it('says how much is still left to assign', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidBasics(user)
    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '1250.00')
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }))

    await user.type(screen.getByLabelText('Aarav share in ₹'), '500.00')
    await user.type(screen.getByLabelText('Diya share in ₹'), '300.00')
    await user.type(screen.getByLabelText('Kabir share in ₹'), '437.50')

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('₹12.50 left to assign')).toBeInTheDocument()
  })

  it('shows the running total as the boxes are filled', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '1250.00')
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }))
    await user.type(screen.getByLabelText('Aarav share in ₹'), '500')

    expect(screen.getByText(/Assigned/)).toHaveTextContent('Assigned ₹500.00 of ₹1250.00')
  })

  it('reports a bad box next to that member', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Amount'), '1250.00')
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }))
    await user.type(screen.getByLabelText('Aarav share in ₹'), '-5')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByLabelText('Aarav share in ₹')).toHaveAccessibleDescription(
      "Can't be negative",
    )
  })
})

describe('the percentages split', () => {
  it('says how much per cent is left to assign', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidBasics(user)
    await user.click(screen.getByRole('radio', { name: 'Percentages' }))
    await user.type(screen.getByLabelText('Aarav share in %'), '33.33')
    await user.type(screen.getByLabelText('Diya share in %'), '33.33')
    await user.type(screen.getByLabelText('Kabir share in %'), '28.34')

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText('5.00% left to assign')).toBeInTheDocument()
  })

  it('keeps each share between 0 and 100', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('radio', { name: 'Percentages' }))
    await user.type(screen.getByLabelText('Aarav share in %'), '120')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByLabelText('Aarav share in %')).toHaveAccessibleDescription(
      'Must be between 0 and 100',
    )
  })
})

describe('saving a valid form', () => {
  it('adds the expense, returns to the bill and confirms it', async () => {
    const user = userEvent.setup()
    const { store } = renderForm()

    await fillValidBasics(user)
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    // It reached the store.
    expect(store.getState().expenses).toHaveLength(7)
    const saved = store.getState().expenses[6]
    expect(saved.description).toBe('Fish thali')
    expect(saved.amount).toBe(50000)
    expect(saved.paidBy).toBe('m1')
    expect(saved.category).toBe('Food')
    expect(saved.split).toEqual({
      type: 'equal',
      memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
    })

    // It navigated back to the bill and said so.
    expect(screen.getByRole('heading', { name: 'Goa, 12–15 March' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Added “Fish thali” to the bill. Balances are up to date.',
    )
  })

  it('updates the balances straight away', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidBasics(user)
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    // Aarav paid ₹500 and owes a fifth of it, so he is ₹400 better off.
    const tickets = screen.getByRole('list')
    expect(within(tickets).getByText('₹18,954.20')).toBeInTheDocument()
  })

  it('lets the message be dismissed', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillValidBasics(user)
    await user.click(screen.getByRole('button', { name: 'Save expense' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('saves an exact split that adds up', async () => {
    const user = userEvent.setup()
    const { store } = renderForm()

    await fillValidBasics(user)
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }))
    await user.type(screen.getByLabelText('Aarav share in ₹'), '200')
    await user.type(screen.getByLabelText('Diya share in ₹'), '300')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(store.getState().expenses[6].split).toEqual({
      type: 'exact',
      shares: { m1: 20000, m2: 30000 },
    })
  })
})

describe('cancelling', () => {
  it('leaves the bill untouched and goes back', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<AppRoutes />, { route: '/' })

    await user.click(screen.getByRole('link', { name: 'Add expense' }))
    await user.type(screen.getByLabelText('Description'), 'Never saved')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Goa, 12–15 March' })).toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(6)
  })

  it('goes to the bill when the form was opened directly', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Goa, 12–15 March' })).toBeInTheDocument()
  })
})
