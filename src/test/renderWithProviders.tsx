import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { SAMPLE_TRIP_DATA } from '../data/sampleTripData'
import type { TripData } from '../domain/types'
import { makeStore } from '../store'

type RenderOptions = {
  /** The URL the test starts on. */
  route?: string
  preloadedState?: TripData
}

/**
 * Renders something inside a brand new store and an in-memory router.
 *
 * A fresh store per test is the point: tests share no state, run in any
 * order, and never read or write the browser's real localStorage. The store
 * is returned so a test can assert on what ended up in it.
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const route = options.route ?? '/'
  const store = makeStore(options.preloadedState ?? SAMPLE_TRIP_DATA)

  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  )

  return { ...result, store }
}
