import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AppRoutes from './App'
import { renderWithProviders } from './test/renderWithProviders'

describe('routing', () => {
  it('shows the expenses page at /', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })

    expect(screen.getByRole('heading', { name: 'Goa, 12–15 March' })).toBeInTheDocument()
  })

  it('shows the add expense page at /expenses/new', () => {
    renderWithProviders(<AppRoutes />, { route: '/expenses/new' })

    expect(screen.getByRole('heading', { name: 'Add to the bill' })).toBeInTheDocument()
  })

  it('marks the current page in the navbar', () => {
    renderWithProviders(<AppRoutes />, { route: '/' })

    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Add expense' })).not.toHaveAttribute('aria-current')
  })

  it('moves the marker when the other page is open', () => {
    renderWithProviders(<AppRoutes />, { route: '/expenses/new' })

    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current')
  })

  it('shows "Page not found" for any other address', () => {
    renderWithProviders(<AppRoutes />, { route: '/somewhere/else' })

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Expenses' })).toHaveAttribute('href', '/')
  })

  it('keeps the navbar on the not-found page', () => {
    renderWithProviders(<AppRoutes />, { route: '/nope' })

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
