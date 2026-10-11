import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../App'
import type { TripData } from '../domain/types'
import { renderWithProviders } from '../test/renderWithProviders'

const EMPTY_TRIP: TripData = {
  members: [
    { id: 'm1', name: 'Aarav' },
    { id: 'm2', name: 'Diya' },
  ],
  expenses: [],
}

function rowFor(description: string): HTMLElement {
  const cell = screen.getByRole('cell', { name: description })
  const row = cell.closest('tr')
  if (row === null) {
    throw new Error(`No row found for ${description}`)
  }
  return row
}

describe('the expenses page', () => {
  it('shows the trip total on the hero sticker', () => {
    renderWithProviders(<AppRoutes />)

    // The same figure is also the table total, so the query is scoped to the
    // sticker rather than matching the first one on the page.
    const sticker = screen.getByText('spent together').closest('p')
    if (sticker === null) {
      throw new Error('The sticker has no container')
    }

    expect(within(sticker).getByText('₹42,249.99')).toBeInTheDocument()
  })

  it('shows every balance, with the sign expressed in words', () => {
    renderWithProviders(<AppRoutes />)

    const tickets = screen.getByRole('list')

    expect(within(tickets).getByText('₹18,554.20')).toBeInTheDocument()
    expect(within(tickets).getByText('₹3,695.78')).toBeInTheDocument()
    expect(within(tickets).getByText('₹554.08')).toBeInTheDocument()
    expect(within(tickets).getByText('₹8,112.50')).toBeInTheDocument()
    expect(within(tickets).getByText('₹7,300.00')).toBeInTheDocument()

    expect(within(tickets).getAllByText('gets back')).toHaveLength(2)
    expect(within(tickets).getAllByText('owes')).toHaveLength(3)
  })

  it('lists the expenses newest date first', () => {
    renderWithProviders(<AppRoutes />)

    const rows = screen.getAllByRole('row')
    // Row 0 is the column headings; the last row is the total.
    const descriptions = rows
      .slice(1, 7)
      .map((row) => within(row).getAllByRole('cell')[1].textContent)

    expect(descriptions[0]).toBe('Airport cab')
    expect(descriptions[1]).toBe('Groceries')
    expect(descriptions[descriptions.length - 1]).toBe('Villa booking')
  })

  it('describes each split in the Split column', () => {
    renderWithProviders(<AppRoutes />)

    expect(within(rowFor('Groceries')).getByText('Equally, 3 people')).toBeInTheDocument()
    expect(within(rowFor('Scuba diving')).getByText('Exact amounts, 3 people')).toBeInTheDocument()
    expect(within(rowFor('Airport cab')).getByText('Percentages, 3 people')).toBeInTheDocument()
  })

  it('shows the total of everything when no filter is on', () => {
    renderWithProviders(<AppRoutes />)

    const totalRow = screen.getByRole('row', { name: /Total shown/ })
    expect(within(totalRow).getByText('₹42,249.99')).toBeInTheDocument()
  })

  it('filters the table and retotals what is left', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Food' }))

    expect(screen.getByRole('cell', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Beach shack dinner' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Airport cab' })).not.toBeInTheDocument()

    const totalRow = screen.getByRole('row', { name: /Total shown/ })
    expect(within(totalRow).getByText('₹4,250.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers a way back when a filter matches nothing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Other' }))

    expect(screen.getByRole('heading', { name: 'No expenses in Other' })).toBeInTheDocument()
    expect(screen.getByText(/Total for this filter is ₹0.00/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all categories' }))

    expect(screen.getByRole('cell', { name: 'Airport cab' })).toBeInTheDocument()
  })

  it('shows the empty state when there are no expenses at all', () => {
    renderWithProviders(<AppRoutes />, { preloadedState: EMPTY_TRIP })

    const emptyState = screen.getByRole('heading', { name: 'Nothing on the bill yet' })
      .parentElement
    if (emptyState === null) {
      throw new Error('The empty state has no container')
    }

    // Scoped to the empty state, because the navbar has a link by this name too.
    expect(within(emptyState).getByRole('link', { name: 'Add expense' })).toHaveAttribute(
      'href',
      '/expenses/new',
    )
    const totalLine = screen.getByText('Total').closest('p')
    if (totalLine === null) {
      throw new Error('The total line has no container')
    }
    expect(within(totalLine).getByText('₹0.00')).toBeInTheDocument()

    expect(screen.getAllByText('settled up')).toHaveLength(2)
  })
})

describe('deleting an expense', () => {
  it('asks first, naming the expense, the payer and the people affected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Take Groceries off the bill?')).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        'Meera paid ₹1,000.00, split equally between Aarav, Diya and Kabir. Their balances change straight away.',
      ),
    ).toBeInTheDocument()
  })

  it('removes the row and updates the balances once confirmed', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }))
    await user.click(screen.getByRole('button', { name: 'Delete expense' }))

    expect(screen.queryByRole('cell', { name: 'Groceries' })).not.toBeInTheDocument()
    expect(store.getState().expenses.map((expense) => expense.id)).not.toContain('e5')

    // Meera paid ₹1,000 for it, so losing the row costs her that credit.
    const tickets = screen.getByRole('list')
    expect(within(tickets).getByText('₹9,112.50')).toBeInTheDocument()

    const totalRow = screen.getByRole('row', { name: /Total shown/ })
    expect(within(totalRow).getByText('₹41,249.99')).toBeInTheDocument()
  })

  it('moves focus back to the bill heading after deleting', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }))
    await user.click(screen.getByRole('button', { name: 'Delete expense' }))

    expect(screen.getByRole('heading', { name: 'Table for five' })).toHaveFocus()
  })

  it('changes nothing when the user keeps it', async () => {
    const user = userEvent.setup()
    const { store } = renderWithProviders(<AppRoutes />)

    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(screen.getByRole('cell', { name: 'Groceries' })).toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(6)
  })
})
