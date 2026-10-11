import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import BalanceTickets from '../components/BalanceTickets'
import CategoryFilter from '../components/CategoryFilter'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ExpenseTable from '../components/ExpenseTable'
import FlashMessage from '../components/FlashMessage'
import Hero from '../components/Hero'
import { formatINR } from '../domain/money'
import { describeSplitMethod } from '../domain/split'
import type { Category, Expense, Member } from '../domain/types'
import { expenseDeleted } from '../store/expensesSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  filterByCategory,
  selectBalances,
  selectExpensesNewestFirst,
  selectLargestAbsoluteBalance,
  selectMembers,
  selectTotalPaise,
  sumAmounts,
} from '../store/selectors'
import styles from './ExpensesPage.module.css'

/**
 * Router state is whatever the previous page passed, so it arrives as
 * `unknown`. This checks it rather than asserting a shape, because a user can
 * land here with any history entry at all.
 */
function readAddedDescription(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) {
    return null
  }
  if (!Object.hasOwn(state, 'addedDescription')) {
    return null
  }

  const record: Record<string, unknown> = { ...state }
  const value = record['addedDescription']

  if (typeof value !== 'string' || value === '') {
    return null
  }

  return value
}

function nameOf(members: Member[], memberId: string): string {
  const member = members.find((candidate) => candidate.id === memberId)
  return member === undefined ? 'Someone' : member.name
}

/** 'Aarav, Diya and Kabir' */
function listNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join('')
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function splitMemberIds(expense: Expense): string[] {
  const split = expense.split
  if (split.type === 'equal') {
    return split.memberIds
  }
  return Object.keys(split.shares)
}

export default function ExpensesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const members = useAppSelector(selectMembers)
  const expenses = useAppSelector(selectExpensesNewestFirst)
  const balances = useAppSelector(selectBalances)
  const largestBalance = useAppSelector(selectLargestAbsoluteBalance)
  const grandTotal = useAppSelector(selectTotalPaise)

  // Three pieces of throwaway UI state. None of them belongs in Redux: no
  // other page needs them, and they should reset when you leave the page.
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)
  const [flashDismissed, setFlashDismissed] = useState(false)

  // Focus goes back here after a row is deleted, so a keyboard user is not
  // dropped at the top of the document when the button they used disappears.
  const billHeadingRef = useRef<HTMLHeadingElement>(null)

  const addedDescription = readAddedDescription(location.state)
  const showFlash = addedDescription !== null && !flashDismissed

  const visibleExpenses = filterByCategory(expenses, activeCategory)
  const visibleTotal = sumAmounts(visibleExpenses)

  function dismissFlash() {
    setFlashDismissed(true)
    // Clear the history entry too, so a reload does not show it again.
    void navigate('.', { replace: true, state: null })
  }

  function confirmDelete() {
    if (pendingDelete === null) {
      return
    }

    dispatch(expenseDeleted(pendingDelete.id))
    setPendingDelete(null)
    billHeadingRef.current?.focus()
  }

  const hasNoExpensesAtAll = expenses.length === 0
  const filterFoundNothing = !hasNoExpensesAtAll && visibleExpenses.length === 0
  const itemNoun = visibleExpenses.length === 1 ? 'item' : 'items'

  return (
    <>
      <Hero
        title="Goa, 12–15 March"
        subtitle="Five friends, six shared bills. Here’s who owes whom."
        stickerLabel="spent together"
        stickerAmount={formatINR(grandTotal)}
      />

      {showFlash ? (
        <FlashMessage
          message={`Added “${addedDescription}” to the bill. Balances are up to date.`}
          onDismiss={dismissFlash}
        />
      ) : null}

      <section className={styles.section} aria-labelledby="balances-heading">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="balances-heading">
            Who owes what
          </h2>
          <p className={styles.sectionNote}>
            Aqua tickets get money back, pink tickets owe. The bar shows how big each balance is.
          </p>
        </div>

        <BalanceTickets members={members} balances={balances} largest={largestBalance} />
      </section>

      <section className={styles.section} aria-labelledby="bill-heading">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle} id="bill-heading">
            The bill
          </h2>
          <CategoryFilter selected={activeCategory} onSelect={setActiveCategory} />
        </div>

        {filterFoundNothing && activeCategory !== null ? (
          <EmptyState
            standalone
            chip={activeCategory}
            title={`No expenses in ${activeCategory}`}
            body="Total for this filter is ₹0.00. Pick another category to see more."
            action={
              <button
                type="button"
                className={styles.showAllButton}
                onClick={() => {
                  setActiveCategory(null)
                }}
              >
                Show all categories
              </button>
            }
          />
        ) : (
          <div className={styles.receipt}>
            <div className={styles.receiptHead}>
              <h3 className={styles.receiptHeading} id="receipt-heading" tabIndex={-1} ref={billHeadingRef}>
                Table for five
              </h3>
              {hasNoExpensesAtAll ? null : (
                <p className={styles.receiptCount}>
                  {visibleExpenses.length} {itemNoun}, newest first
                </p>
              )}
            </div>

            {hasNoExpensesAtAll ? (
              <>
                <EmptyState
                  title="Nothing on the bill yet"
                  body="Add the first expense and everyone’s balance appears here."
                  action={
                    <Link to="/expenses/new" className={styles.addLink}>
                      Add expense
                    </Link>
                  }
                />
                <p className={styles.emptyTotal}>
                  <span>Total</span>
                  <span className={`${styles.emptyTotalAmount} money`}>{formatINR(0)}</span>
                </p>
              </>
            ) : (
              <ExpenseTable
                expenses={visibleExpenses}
                members={members}
                totalPaise={visibleTotal}
                onDelete={setPendingDelete}
              />
            )}

            <div className={styles.zigzag} aria-hidden="true" />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete === null ? '' : `Take ${pendingDelete.description} off the bill?`
        }
        description={
          pendingDelete === null
            ? ''
            : `${nameOf(members, pendingDelete.paidBy)} paid ${formatINR(pendingDelete.amount)}, split ${describeSplitMethod(pendingDelete.split)} between ${listNames(splitMemberIds(pendingDelete).map((memberId) => nameOf(members, memberId)))}. Their balances change straight away.`
        }
        confirmLabel="Delete expense"
        cancelLabel="Keep it"
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null)
        }}
      />
    </>
  )
}
