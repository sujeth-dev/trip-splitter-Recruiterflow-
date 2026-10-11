import { describeBalance } from '../domain/balances'
import type { Member } from '../domain/types'
import styles from './BalanceTickets.module.css'

type BalanceTicketsProps = {
  members: Member[]
  balances: Map<string, number>
  /** The biggest balance on the trip, used to scale every bar to the same ruler. */
  largest: number
}

const TONE_CLASS = {
  'gets-back': styles.getsBack,
  owes: styles.owes,
  settled: styles.settled,
}

/** How wide this member's bar should be, as a percentage of half the track. */
function barPercent(paise: number, largest: number): number {
  if (largest === 0) {
    return 0
  }
  return Math.round((Math.abs(paise) / largest) * 100)
}

export default function BalanceTickets({ members, balances, largest }: BalanceTicketsProps) {
  // Biggest credit first, then biggest debt: the people who need paying show
  // up before the people who need to pay.
  const sorted = [...members].sort((left, right) => {
    const leftBalance = balances.get(left.id) ?? 0
    const rightBalance = balances.get(right.id) ?? 0
    return rightBalance - leftBalance
  })

  return (
    <ul className={styles.list}>
      {sorted.map((member, index) => {
        const paise = balances.get(member.id) ?? 0
        const balance = describeBalance(paise)
        const percent = barPercent(paise, largest)
        const tilt = index % 2 === 0 ? styles.tiltLeft : styles.tiltRight

        return (
          <li key={member.id} className={`${styles.ticket} ${TONE_CLASS[balance.kind]} ${tilt}`}>
            <div className={styles.head}>
              <span className={styles.initial} aria-hidden="true">
                {member.name.slice(0, 1)}
              </span>
              <span className={styles.name}>{member.name}</span>
            </div>

            <div className={styles.body}>
              <span className={styles.label}>{balance.label}</span>
              {balance.amount === null ? null : (
                <span className={`${styles.amount} money`}>{balance.amount}</span>
              )}

              <div className={styles.bar} aria-hidden="true">
                <div className={styles.barLeft}>
                  {balance.kind === 'owes' ? (
                    <div className={styles.fill} style={{ width: `${percent}%` }} />
                  ) : null}
                </div>
                <div className={styles.barRight}>
                  {balance.kind === 'gets-back' ? (
                    <div className={styles.fill} style={{ width: `${percent}%` }} />
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
