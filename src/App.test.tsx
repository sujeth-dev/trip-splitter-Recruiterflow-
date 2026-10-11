import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

// A "smoke test": it only checks the app renders without crashing.
// It proves the whole test setup (Vitest + jsdom + Testing Library) works.
describe('App', () => {
  it('shows the app name', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'hisaab!' })).toBeInTheDocument()
  })
})
