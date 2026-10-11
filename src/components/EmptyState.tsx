import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  /** A category chip shown above the title, for the filtered empty state. */
  chip?: string
  title: string
  body: string
  /** The link or button offering the way out of the empty state. */
  action: ReactNode
  standalone?: boolean
}

export default function EmptyState({ chip, title, body, action, standalone }: EmptyStateProps) {
  const className = standalone === true ? `${styles.empty} ${styles.standalone}` : styles.empty

  return (
    <div className={className}>
      {chip === undefined ? null : <span className={styles.chip}>{chip}</span>}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
      {action}
    </div>
  )
}
