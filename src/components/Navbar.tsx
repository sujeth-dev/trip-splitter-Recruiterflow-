import { NavLink } from 'react-router'
import styles from './Navbar.module.css'

/**
 * NavLink is used instead of Link because it sets aria-current="page" on the
 * link for the current route by itself. The CSS then styles that attribute,
 * so what a sighted user sees and what a screen reader announces can never
 * drift apart.
 */
export default function Navbar() {
  return (
    <header>
      <nav className={styles.bar} aria-label="Main">
        <NavLink to="/" className={styles.brand}>
          hisaab!
        </NavLink>

        <div className={styles.links}>
          <NavLink to="/" end className={styles.link}>
            Expenses
          </NavLink>

          <NavLink to="/expenses/new" className={`${styles.link} ${styles.primary}`}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span className={styles.addLabel}>Add expense</span>
          </NavLink>
        </div>
      </nav>
    </header>
  )
}
