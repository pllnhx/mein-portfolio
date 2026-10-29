import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import ArtDock from '../../components/ui/ArtDock/ArtDock'
import { artCategories } from '../../data/art'
import styles from './ArtPage.module.css'

function ArtLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const previousTitle = document.title
    const path = pathname.replace(/\/$/, '')
    const category = artCategories.find((item) => item.path === path)
    const title = path === '/art' ? 'Kunst' : category?.title ?? 'Galerie nicht gefunden'
    document.title = `${title} – Pascal / Atelier`
    return () => { document.title = previousTitle }
  }, [pathname])

  useEffect(() => {
    const previousLanguage = document.documentElement.lang
    document.documentElement.lang = 'de'
    return () => { document.documentElement.lang = previousLanguage }
  }, [])

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#art-content">Zum Inhalt</a>
      <header className={styles.header}>
        <Link to="/" className={styles.homeLink}>
          <span className={styles.backArrow} aria-hidden="true">←</span>
          <span>Zurück zur Startseite</span>
        </Link>
        <Link to="/art" className={styles.wordmark} aria-label="Pascal – Kunstübersicht">
          pascal<span className={styles.wordmarkDot}>.</span>
        </Link>
        <span className={styles.headerNote}>Ein Raum für Kunst<span aria-hidden="true"> ↗</span></span>
      </header>

      <main id="art-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      <ArtDock />
    </div>
  )
}

export default ArtLayout
