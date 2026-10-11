import { formatShortDate } from '../domain/dates'
import { formatINR } from '../domain/money'
import { describeSplit } from '../domain/split'
import type { Expense, Member } from '../domain/types'
import styles from './ExpenseTable.module.css'

type ExpenseTableProps = {
  expenses: Expense[]
  members: Member[]
  totalPaise: number
  onDelete: (expense: Expense) => void
}

function nameOf(members: Member[], memberId: string): string {
  const member = members.find((candidate) => candidate.id === memberId)
  if (member === undefined) {
    // Unreachable with validated data, but a readable fallback beats a crash.
    return 'Unknown'
  }
  return member.name
}

export default function ExpenseTable({
  expenses,
  members,
  totalPaise,
  onDelete,
}: ExpenseTableProps) {
  return (
    <>
      {/* The roles are written out because the stylesheet changes `display`
          on these elements below 640px to stack each row as a card, and a
          changed display would otherwise remove the table semantics. */}
      <table className={styles.table} role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col">Date</th>
            <th role="columnheader" scope="col">Description</th>
            <th role="columnheader" scope="col">Category</th>
            <th role="columnheader" scope="col">Paid by</th>
            <th role="columnheader" scope="col" className={styles.amountHeader}>Amount</th>
            <th role="columnheader" scope="col">Split</th>
            <th role="columnheader" scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody role="rowgroup">
          {expenses.map((expense) => (
            <tr key={expense.id} role="row">
              <td role="cell" className={styles.date}>{formatShortDate(expense.date)}</td>
              <td role="cell" className={styles.description}>{expense.description}</td>
              <td role="cell" className={styles.category}>
                <span className={`${styles.chip} ${styles[expense.category]}`}>
                  {expense.category}
                </span>
              </td>
              <td role="cell" className={styles.paidBy}>
                {nameOf(members, expense.paidBy)}
                <span className={styles.paidSuffix}> paid.</span>
              </td>
              <td role="cell" className={`${styles.amount} money`}>{formatINR(expense.amount)}</td>
              <td role="cell" className={styles.split}>{describeSplit(expense.split)}</td>
              <td role="cell" className={styles.actions}>
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label={`Delete ${expense.description}`}
                  onClick={() => {
                    onDelete(expense)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot role="rowgroup">
          <tr role="row" className={styles.totalRow}>
            <th role="rowheader" scope="row" colSpan={4}>Total shown</th>
            <td role="cell" className={`${styles.totalAmount} money`} colSpan={3}>
              {formatINR(totalPaise)}
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}
