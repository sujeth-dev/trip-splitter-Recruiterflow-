import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// One config file for both the dev server (Vite) and the tests (Vitest).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // a fake browser, so React components can render in tests
    setupFiles: ['./src/test/setup.ts'], // runs before every test file
  },
})
