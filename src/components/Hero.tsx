import styles from './Hero.module.css'

type HeroProps = {
  title: string
  subtitle: string
  /** The sticker is only shown when there is a figure worth shouting about. */
  stickerLabel?: string
  stickerAmount?: string
}

export default function Hero({ title, subtitle, stickerLabel, stickerAmount }: HeroProps) {
  const hasSticker = stickerLabel !== undefined && stickerAmount !== undefined

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {hasSticker ? (
          <p className={styles.sticker}>
            <span className={styles.stickerLabel}>{stickerLabel}</span>
            <span className={`${styles.stickerAmount} money`}>{stickerAmount}</span>
          </p>
        ) : null}
      </div>

      {/* Decoration only: it carries no information, so it is hidden from
          screen readers rather than announced as an empty element. */}
      <div className={styles.awning} aria-hidden="true" />
    </section>
  )
}
