import { useEffect, useRef } from 'react'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Built on the native <dialog> element opened with showModal().
 *
 * That one call gives focus trapping, Escape to close, inerting the rest of
 * the page and a ::backdrop for free. A hand-rolled div would need all of
 * that written and tested by hand, and would still be easy to get wrong.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // showModal() is imperative, so opening and closing has to be kept in step
  // with the `open` prop rather than expressed in the markup.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        // Escape would close the dialog behind React's back, leaving the
        // parent still thinking it is open. Cancel the native close and let
        // the same callback the button uses drive it instead.
        event.preventDefault()
        onCancel()
      }}
    >
      <div className={styles.inner}>
        <h2 className={styles.title} id="confirm-dialog-title">
          {title}
        </h2>
        <p className={styles.body}>{description}</p>

        <div className={styles.buttons}>
          <button type="button" className={styles.button} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.confirm}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
