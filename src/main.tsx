import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

// The template used `document.getElementById('root')!`. The `!` tells
// TypeScript "trust me, it's not null". We check instead, so a missing
// element fails with a clear message rather than a confusing crash.
const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Could not find the #root element in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
