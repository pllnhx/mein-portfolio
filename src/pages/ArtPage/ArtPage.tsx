import { useRef } from 'react'

import PaintDrips from '../../components/effects/PaintDrips/PaintDrips'
import styles from './ArtPage.module.css'

const letters = [
  { letter: 'K', asset: 'k', medium: 'Graphit' },
  { letter: 'U', asset: 'u', medium: 'Acryl' },
  { letter: 'N', asset: 'n', medium: 'Copic' },
  { letter: 'S', asset: 's', medium: 'Kohle' },
  { letter: 'T', asset: 't', medium: 'Farbe' },
]

function ArtPage() {
  const paintLetter = useRef<HTMLImageElement>(null)

  return (
    <>
      <PaintDrips anchorRef={paintLetter} />
      <section className={styles.hero} aria-labelledby="art-title">
        <div className={styles.heroHeading}>
          <p className={styles.eyebrow}><span className={styles.eyebrowLine} /> PASCAL / ATELIER</p>
          <p className={styles.handwritten}>Alles beginnt mit einer Spur.</p>
        </div>

        <h1 id="art-title" className={styles.artTitle} aria-label="KUNST">
          {letters.map(({ letter, asset, medium }) => (
            <span key={letter} className={`${styles.letter} ${styles[`letter${letter}`]}`} aria-hidden="true">
              <img
                ref={letter === 'T' ? paintLetter : undefined}
                src={`/art/letters/${asset}.png`}
                alt=""
                width={1024}
                height={1024}
                draggable={false}
                fetchPriority="high"
              />
              <span className={styles.mediumLabel}>{medium}</span>
            </span>
          ))}
        </h1>

        <div className={styles.heroCopy}>
          <p className={styles.introduction}>Sieben Techniken.<br className={styles.mobileBreak} /> Ein Atelier.</p>
          <p className={styles.description}>Von der ersten Linie bis zur letzten Farbschicht.<br />Entdecke meine Welt aus Zeichnung und Malerei.</p>
        </div>

        <div className={styles.heroBottom}>
          <span className={styles.pageIndex}><span aria-hidden="true">01</span> / KREATIVE FREIHEIT</span>
          <p className={styles.dockHint}>Wähle dein Werkzeug<span className={styles.hintArrow} aria-hidden="true">↘</span></p>
          <span className={styles.paperNote}>PAPIER. PIGMENT. PERSPEKTIVE.</span>
        </div>
      </section>
    </>
  )
}

export default ArtPage
