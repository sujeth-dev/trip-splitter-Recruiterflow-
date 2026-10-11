import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import FieldError from '../components/FieldError'
import Hero from '../components/Hero'
import { todayLocalISO } from '../domain/dates'
import { formatINR, formatPercent } from '../domain/money'
import { CATEGORIES, type Member } from '../domain/types'
import {
  makeEmptyDraft,
  summariseErrors,
  sumExactShares,
  sumPercentShares,
  validateExpenseDraft,
  type DraftErrors,
  type ExpenseDraft,
  type SplitType,
} from '../domain/validation'
import { expenseAdded } from '../store/expensesSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { selectMembers } from '../store/selectors'
import styles from './AddExpensePage.module.css'

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percent', label: 'Percentages' },
]

const NO_ERRORS: DraftErrors = {}

/** Reads a per-member error without tripping over a missing key. */
function shareErrorFor(errors: DraftErrors, memberId: string): string | undefined {
  if (errors.shares === undefined || !Object.hasOwn(errors.shares, memberId)) {
    return undefined
  }
  return errors.shares[memberId]
}

function readShare(shares: Record<string, string>, memberId: string): string {
  if (!Object.hasOwn(shares, memberId)) {
    return ''
  }
  return shares[memberId]
}

export default function AddExpensePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const members = useAppSelector(selectMembers)

  // Read once, on the first render, and kept for the life of the page: today
  // must not change underneath the user if the form is open at midnight.
  // useState with an initialiser function, not useRef, because this value is
  // used while rendering.
  const [today] = useState(() => todayLocalISO())

  const [draft, setDraft] = useState<ExpenseDraft>(() => makeEmptyDraft(members, today))

  // Counts failed saves rather than just remembering that one happened, so a
  // second failed attempt can send focus back to the summary again.
  //
  // Errors appear only once Save has been pressed. Shouting at someone for an
  // empty box they have not reached yet is not helpful; after they have tried
  // to save, live feedback is.
  const [failedSaves, setFailedSaves] = useState(0)

  const summaryRef = useRef<HTMLDivElement>(null)

  const validation = validateExpenseDraft(draft, members, today)
  const errors = failedSaves > 0 && !validation.ok ? validation.errors : NO_ERRORS
  const hasErrors = Object.keys(errors).length > 0

  // The summary is not in the DOM until React has re-rendered with the new
  // errors, so focusing it inside the submit handler would find nothing.
  // An effect runs after that render, when the element exists.
  useEffect(() => {
    if (failedSaves === 0) {
      return
    }
    summaryRef.current?.focus()
  }, [failedSaves])

  function update(changes: Partial<ExpenseDraft>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function toggleMember(memberId: string, selected: boolean) {
    setDraft((current) => ({
      ...current,
      selectedMemberIds: selected
        ? [...current.selectedMemberIds, memberId]
        : current.selectedMemberIds.filter((id) => id !== memberId),
    }))
  }

  function setShare(kind: 'exactShares' | 'percentShares', memberId: string, value: string) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], [memberId]: value } }))
  }

  function handleSubmit() {
    const result = validateExpenseDraft(draft, members, today)

    if (!result.ok) {
      // Showing the summary and moving the reader to it, so they are told
      // what went wrong instead of staring at an unchanged form.
      setFailedSaves((count) => count + 1)
      return
    }

    // The id is made here, not in the reducer, so the reducer stays pure.
    dispatch(expenseAdded({ id: crypto.randomUUID(), ...result.expense }))
    void navigate('/', { state: { addedDescription: result.expense.description } })
  }

  function handleCancel() {
    // 'default' is the key React Router gives the very first history entry,
    // which means there is nothing to go back to (someone opened this URL
    // directly, or it is the first page of the session).
    if (location.key === 'default') {
      void navigate('/')
      return
    }
    void navigate(-1)
  }

  return (
    <>
      <Hero
        title="Add to the bill"
        subtitle="Say who paid and who it was for. Balances update when you save."
      />

      {hasErrors ? (
        <div className={styles.summary} role="alert" tabIndex={-1} ref={summaryRef}>
          <span className={styles.summaryMark} aria-hidden="true">
            !
          </span>
          <span>{summariseErrors(errors)}</span>
        </div>
      ) : null}

      <form
        className={styles.card}
        noValidate
        onSubmit={(event) => {
          // Without this the browser reloads the page on submit; React Router
          // owns navigation here instead.
          event.preventDefault()
          handleSubmit()
        }}
      >
        <div className={styles.cardHead}>
          <h2 className={styles.cardHeading}>New item</h2>
          <p className={styles.cardNote}>Table for five</p>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <input
              id="description"
              className={styles.input}
              type="text"
              value={draft.description}
              placeholder="Fish thali at Britto’s"
              aria-invalid={errors.description !== undefined}
              aria-describedby={errors.description === undefined ? undefined : 'description-error'}
              onChange={(event) => {
                update({ description: event.target.value })
              }}
            />
            <FieldError id="description-error" message={errors.description} />
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="amount">
                Amount
              </label>
              <div className={styles.amountBox}>
                <span className={styles.amountPrefix} aria-hidden="true">
                  ₹
                </span>
                <input
                  id="amount"
                  className={`${styles.amountInput} money`}
                  type="text"
                  inputMode="decimal"
                  value={draft.amount}
                  placeholder="1250.00"
                  aria-invalid={errors.amount !== undefined}
                  aria-describedby={errors.amount === undefined ? undefined : 'amount-error'}
                  onChange={(event) => {
                    update({ amount: event.target.value })
                  }}
                />
              </div>
              <FieldError id="amount-error" message={errors.amount} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                className={styles.input}
                type="date"
                value={draft.date}
                max={today}
                aria-invalid={errors.date !== undefined}
                aria-describedby={errors.date === undefined ? undefined : 'date-error'}
                onChange={(event) => {
                  update({ date: event.target.value })
                }}
              />
              <FieldError id="date-error" message={errors.date} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="paidBy">
                Paid by
              </label>
              <select
                id="paidBy"
                className={styles.select}
                value={draft.paidBy}
                aria-invalid={errors.paidBy !== undefined}
                aria-describedby={errors.paidBy === undefined ? undefined : 'paidBy-error'}
                onChange={(event) => {
                  update({ paidBy: event.target.value })
                }}
              >
                <option value="">Pick a person</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <FieldError id="paidBy-error" message={errors.paidBy} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="category">
                Category
              </label>
              <select
                id="category"
                className={styles.select}
                value={draft.category}
                aria-invalid={errors.category !== undefined}
                aria-describedby={errors.category === undefined ? undefined : 'category-error'}
                onChange={(event) => {
                  update({ category: event.target.value })
                }}
              >
                <option value="">Pick a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <FieldError id="category-error" message={errors.category} />
            </div>
          </div>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>How should it be split?</legend>

            <div className={styles.splitOptions}>
              {SPLIT_OPTIONS.map((option) => (
                <label key={option.value} className={styles.splitOption}>
                  <input
                    className={styles.radio}
                    type="radio"
                    name="splitType"
                    value={option.value}
                    checked={draft.splitType === option.value}
                    onChange={() => {
                      update({ splitType: option.value })
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {draft.splitType === 'equal' ? (
              <EqualSplitFields
                members={members}
                selectedMemberIds={draft.selectedMemberIds}
                onToggle={toggleMember}
              />
            ) : null}

            {draft.splitType === 'exact' ? (
              <ShareFields
                members={members}
                kind="exactShares"
                legendSuffix="share in ₹"
                values={draft.exactShares}
                errors={errors}
                onChange={setShare}
              />
            ) : null}

            {draft.splitType === 'percent' ? (
              <ShareFields
                members={members}
                kind="percentShares"
                legendSuffix="share in %"
                values={draft.percentShares}
                errors={errors}
                onChange={setShare}
              />
            ) : null}

            {draft.splitType === 'equal' ? null : (
              <AssignedLine draft={draft} members={members} splitError={errors.split} />
            )}

            <FieldError id="split-error" message={draft.splitType === 'equal' ? errors.split : undefined} />
          </fieldset>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className={`${styles.button} ${styles.save}`}>
            Save expense
          </button>
        </div>
      </form>
    </>
  )
}

type EqualSplitFieldsProps = {
  members: Member[]
  selectedMemberIds: string[]
  onToggle: (memberId: string, selected: boolean) => void
}

function EqualSplitFields({ members, selectedMemberIds, onToggle }: EqualSplitFieldsProps) {
  return (
    <div className={styles.members}>
      {members.map((member) => (
        <label key={member.id} className={styles.memberCheck}>
          <input
            className={styles.checkbox}
            type="checkbox"
            checked={selectedMemberIds.includes(member.id)}
            onChange={(event) => {
              onToggle(member.id, event.target.checked)
            }}
          />
          {member.name}
        </label>
      ))}
    </div>
  )
}

type ShareFieldsProps = {
  members: Member[]
  kind: 'exactShares' | 'percentShares'
  legendSuffix: string
  values: Record<string, string>
  errors: DraftErrors
  onChange: (kind: 'exactShares' | 'percentShares', memberId: string, value: string) => void
}

function ShareFields({ members, kind, legendSuffix, values, errors, onChange }: ShareFieldsProps) {
  return (
    <div className={styles.members}>
      {members.map((member) => {
        const inputId = `${kind}-${member.id}`
        const message = shareErrorFor(errors, member.id)

        return (
          <div key={member.id} className={styles.shareRow}>
            <label className={styles.shareLabel} htmlFor={inputId}>
              {member.name} {legendSuffix}
            </label>
            <span className={styles.shareLeader} aria-hidden="true" />
            <input
              id={inputId}
              className={`${styles.shareInput} money`}
              type="text"
              inputMode="decimal"
              value={readShare(values, member.id)}
              placeholder="0"
              aria-invalid={message !== undefined}
              aria-describedby={message === undefined ? undefined : `${inputId}-error`}
              onChange={(event) => {
                onChange(kind, member.id, event.target.value)
              }}
            />
            <div className={styles.shareError}>
              <FieldError id={`${inputId}-error`} message={message} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

type AssignedLineProps = {
  draft: ExpenseDraft
  members: Member[]
  splitError: string | undefined
}

/**
 * The running total under the share boxes. It updates on every keystroke so
 * the user can see the gap closing, rather than finding out only on Save.
 */
function AssignedLine({ draft, members, splitError }: AssignedLineProps) {
  const isPercent = draft.splitType === 'percent'

  const assigned = isPercent ? sumPercentShares(draft, members) : sumExactShares(draft, members)
  const target = isPercent ? 10000 : null

  const assignedText = isPercent ? formatPercent(assigned) : formatINR(assigned)
  const targetText = isPercent ? formatPercent(10000) : draft.amount.trim()

  const isDone = isPercent ? assigned === target : splitError === undefined

  return (
    <p className={styles.assigned}>
      <span>
        Assigned <span className="money">{assignedText}</span>
        {targetText === '' ? null : <> of {isPercent ? targetText : `₹${targetText}`}</>}
      </span>
      {splitError === undefined ? (
        <span className={`${styles.assignedBadge} ${isDone ? styles.assignedDone : ''}`}>
          {isDone ? 'All assigned' : 'Keep going'}
        </span>
      ) : (
        <span className={styles.assignedBadge} id="split-total-error">
          {splitError}
        </span>
      )}
    </p>
  )
}
