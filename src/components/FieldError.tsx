import styles from './FieldError.module.css'

type FieldErrorProps = {
  /** Must match the input's aria-describedby so the two are linked. */
  id: string
  message: string | undefined
}

/**
 * One field's error message. Rendering nothing when there is no message keeps
 * aria-describedby pointing at an element that genuinely exists.
 */
export default function FieldError({ id, message }: FieldErrorProps) {
  if (message === undefined) {
    return null
  }

  return (
    <span className={styles.error} id={id}>
      {message}
    </span>
  )
}
