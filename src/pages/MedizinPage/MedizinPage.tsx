import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router'

import styles from './MedizinPage.module.css'
import InteractivePortrait from './InteractivePortrait'
import useMedizinMotion from './useMedizinMotion'

function handleHomeNavigation(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

function Arrow({ direction = 'diagonal' }: { direction?: 'diagonal' | 'down' | 'up' }) {
  const paths = {
    diagonal: 'M5 19 19 5M5 5h14v14',
    down: 'M12 4v16m-7-7 7 7 7-7',
    up: 'M12 20V4m-7 7 7-7 7 7',
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={paths[direction]} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function MedizinPage() {
  const page = useRef<HTMLDivElement>(null)
  useMedizinMotion(page)

  useEffect(() => {
    const previousTitle = document.title
    const previousLanguage = document.documentElement.lang
    document.title = 'Medizin – Pascal'
    document.documentElement.lang = 'de'
    const anchor = window.location.hash.slice(1)
    const target = ['medizin-content', 'einblicke', 'themen'].includes(anchor)
      ? document.getElementById(anchor)
      : null
    if (target) target.scrollIntoView({ behavior: 'instant' })
    else window.scrollTo({ top: 0, behavior: 'instant' })

    return () => {
      document.title = previousTitle
      document.documentElement.lang = previousLanguage
    }
  }, [])

  return (
    <div ref={page} className={styles.page} id="medizin-top">
      <div className={styles.scrollProgress} aria-hidden="true" />
      <a href="#medizin-content" className={styles.skipLink}>Zum Inhalt</a>

      <header className={styles.header}>
        <Link to="/" onClick={handleHomeNavigation} className={styles.wordmark} aria-label="Pascal – zur Startseite">
          pascal<span>.</span>
        </Link>
        <nav aria-label="Medizin-Seitennavigation" className={styles.navigation}>
          <a href="#einblicke">Einblicke</a>
          <a href="#themen">Themen & Projekte</a>
        </nav>
        <Link to="/" onClick={handleHomeNavigation} className={styles.homeLink}>
          <span>Startseite</span><Arrow />
        </Link>
      </header>

      <main id="medizin-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="medizin-title">
          <div className={styles.eyebrow}>
            <span><i className={styles.dot} aria-hidden="true" /> Ein neuer Blickwinkel</span>
            <span>Pascal / Portfolio / 03</span>
          </div>

          <h1 id="medizin-title" className={styles.title} aria-label="Medizin">
            <span aria-hidden="true">{'MEDIZIN'.split('').map((letter, index) => <span key={index} data-parallax={10 + index % 3 * 7} data-pointer={3 + index * 1.5}>{letter}</span>)}</span>
          </h1>

          <div className={styles.heroBody}>
            <div className={styles.heroCopy}>
              <p className={styles.smallLabel}>Neugier als Ausgangspunkt.</p>
              <p className={styles.heroStatement}>Der Mensch.<br />Die Fragen.<br /><em>Die Medizin.</em></p>
              <p className={styles.heroDescription}>Hier entsteht ein Raum für Gedanken, Themen und Projekte rund um Medizin.</p>
              <a href="#einblicke" className={styles.roundLink}>
                <span className={styles.roundIcon}><span data-pointer="5"><Arrow direction="down" /></span></span>
                <span>Den Bereich entdecken</span>
              </a>
            </div>

            <InteractivePortrait />

            <div className={styles.heroAside} aria-hidden="true">
              <span>Ein Bereich im Entstehen</span>
              <span>↓</span>
            </div>
          </div>

          <div className={styles.heroBottom}>
            <span>Medizin. Aus Neugier.</span>
            <span className={styles.progress}><i />In Arbeit</span>
          </div>
        </section>

        <section id="einblicke" className={styles.insights} aria-labelledby="insights-title">
          <div className={styles.sectionLabel} data-reveal><span>01 — Einblicke</span><span data-pointer="8" aria-hidden="true">+</span></div>

          <div className={styles.insightsIntro}>
            <h2 id="insights-title" data-reveal>Raum zum<br /><em>Verstehen.</em></h2>
            <p data-reveal>Ein Anfang, noch kein fertiges Bild. Hier finden später eigene Einblicke und medizinische Themen ihren Platz.</p>
          </div>

          <div className={styles.insightsGrid}>
            <figure className={styles.detailFigure} data-reveal>
              <div className={styles.detailImageWrap}>
                <img
                  src="/medizin/detail-placeholder.svg"
                  width="1200" height="900"
                  alt="Abstrakte organische Form als Bildplatzhalter für künftige Einblicke"
                  loading="lazy"
                  data-parallax="16" data-pointer="7"
                />
                <span className={styles.figureNumber} aria-hidden="true">01</span>
              </div>
              <figcaption><span>Ein anderer Blick.</span><span>Bildplatzhalter</span></figcaption>
            </figure>

            <div className={styles.studyColumn}>
              <div className={styles.studyNote} data-reveal>
                <span className={styles.noteCross} data-parallax="18" data-pointer="-9" aria-hidden="true">✳</span>
                <p>Fragen stellen.<br />Zusammenhänge sehen.<br /><em>Weiterdenken.</em></p>
              </div>
              <figure className={styles.studyFigure} data-reveal>
                <div className={styles.studyImageWrap}>
                  <img
                    src="/medizin/study-placeholder.svg"
                    width="1100" height="800"
                    alt="Abstrakte räumliche Strukturen als Bildplatzhalter für künftige Themen"
                    loading="lazy"
                    data-parallax="12" data-pointer="6"
                  />
                  <span className={styles.figureNumber} aria-hidden="true">02</span>
                </div>
                <figcaption><span>Das Detail im Ganzen.</span><span>Bildplatzhalter</span></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="themen" className={styles.topics} aria-labelledby="topics-title">
          <div className={styles.sectionLabel} data-reveal><span>02 — Was hier entsteht</span><span data-pointer="8" aria-hidden="true">+</span></div>
          <div className={styles.topicsHeader} data-reveal>
            <h2 id="topics-title">Themen &<br /><em>Projekte.</em></h2>
            <span className={styles.topicsCount}><span aria-hidden="true">[ 00 ]</span><span className={styles.srOnly}>Noch keine Einträge</span></span>
          </div>
          <div className={styles.emptyState} data-reveal>
            <span className={styles.emptyIcon} aria-hidden="true">↗</span>
            <div>
              <h3>Der Anfang ist gemacht.</h3>
              <p>Inhalte folgen. Hier ist Platz für medizinische Themen, eigene Gedanken und kommende Projekte.</p>
            </div>
            <span className={styles.emptyStatus}><i className={styles.dot} aria-hidden="true" /> Im Aufbau</span>
          </div>
          <p className={styles.topicsFootnote}>Noch offen. Und voller Möglichkeiten.</p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <p data-reveal>Neugier<br />bleibt<span>.</span></p>
          <a href="#medizin-top" className={styles.topLink}>
            <span>Nach oben</span><span className={styles.roundIcon}><span data-pointer="5"><Arrow direction="up" /></span></span>
          </a>
        </div>
        <div className={styles.footerBottom}>
          <Link to="/" onClick={handleHomeNavigation} className={styles.footerWordmark} aria-label="Pascal – zur Startseite">pascal.</Link>
          <span>Medizin / Ein Bereich im Entstehen</span>
          <Link to="/" onClick={handleHomeNavigation}>Zurück zur Startseite <Arrow /></Link>
        </div>
      </footer>
    </div>
  )
}

export default MedizinPage
