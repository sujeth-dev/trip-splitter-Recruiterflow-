import { Outlet, Route, Routes } from 'react-router'
import Navbar from './components/Navbar'
import AddExpensePage from './pages/AddExpensePage'
import ExpensesPage from './pages/ExpensesPage'
import NotFoundPage from './pages/NotFoundPage'
import styles from './App.module.css'

/** The frame every page sits in: one navbar, one <main>, swappable middle. */
function Layout() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

/**
 * The routes only. The Router itself lives in main.tsx (and in the test
 * helper), so tests can wrap these routes in a MemoryRouter and start on any
 * URL without touching the browser's address bar.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExpensesPage />} />
        <Route path="expenses/new" element={<AddExpensePage />} />
        {/* Anything else at all. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
