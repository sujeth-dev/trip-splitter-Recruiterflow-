// Runs before every test file (see `setupFiles` in vite.config.ts).
import '@testing-library/jest-dom/vitest' // adds matchers like toBeInTheDocument()
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove whatever the previous test rendered, so tests don't affect each other.
afterEach(() => {
  cleanup()
})

/**
 * jsdom implements the <dialog> element but not showModal() or close(), so
 * ConfirmDialog would throw the moment a test opened it.
 *
 * These stand-ins only do the part the tests care about: flip the `open`
 * attribute, which is what decides whether the content is in the accessible
 * tree. Real focus trapping is the browser's job and is checked by hand.
 * This lives in the test setup alone; nothing in src/ is changed for tests.
 */
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.open = true
}

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.open = false
  this.dispatchEvent(new Event('close'))
}
