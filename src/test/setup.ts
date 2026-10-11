// Runs before every test file (see `setupFiles` in vite.config.ts).
import '@testing-library/jest-dom/vitest' // adds matchers like toBeInTheDocument()
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove whatever the previous test rendered, so tests don't affect each other.
afterEach(() => {
  cleanup()
})
