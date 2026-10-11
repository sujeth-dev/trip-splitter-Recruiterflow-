import { Link } from 'react-router'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <section className={styles.card}>
      <div className={styles.inner}>
        <p className={styles.badge} aria-hidden="true">
          404
        </p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.body}>This address doesn&rsquo;t match any page in the app.</p>
        <Link to="/" className={styles.link}>
          Back to Expenses
        </Link>
      </div>
      <div className={styles.awning} aria-hidden="true" />
    </section>
  )
}
