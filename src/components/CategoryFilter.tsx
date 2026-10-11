import { CATEGORIES, type Category } from '../domain/types'
import styles from './CategoryFilter.module.css'

type CategoryFilterProps = {
  /** null means "All", which is not a Category. */
  selected: Category | null
  onSelect: (category: Category | null) => void
}

/**
 * Toggle buttons rather than a <select>, because all six options are worth
 * showing at once. They are buttons with aria-pressed, not links or radios:
 * nothing navigates, and only one filter is on at a time.
 */
export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className={styles.filter} role="group" aria-label="Filter by category">
      <button
        type="button"
        className={styles.chip}
        aria-pressed={selected === null}
        onClick={() => {
          onSelect(null)
        }}
      >
        All
      </button>

      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          className={`${styles.chip} ${styles[category]}`}
          aria-pressed={selected === category}
          onClick={() => {
            onSelect(category)
          }}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
