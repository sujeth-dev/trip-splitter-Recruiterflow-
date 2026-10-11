import styles from './FlashMessage.module.css'

type FlashMessageProps = {
  message: string
  onDismiss: () => void
}

export default function FlashMessage({ message, onDismiss }: FlashMessageProps) {
  return (
    <div className={styles.flash} role="status">
      <span className={styles.tick} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12.8c1.6 1.4 3 2.9 4.4 4.6 3.1-4.4 6.3-8.4 10.6-11.9" />
        </svg>
      </span>

      <span className={styles.text}>{message}</span>

      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss message">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6.2 5.8c4 4.1 7.9 8.2 11.6 12.6M18.1 6.1c-4.2 3.9-8.2 7.9-12 12.1" />
        </svg>
      </button>
    </div>
  )
}
