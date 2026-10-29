import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import DepthPortrait from '../../components/effects/DepthPortrait/DepthPortrait'
import { PORTRAIT_ASSETS } from '../../components/effects/DepthPortrait/portraitAssets'
import ProjectCard from '../../components/ui/ProjectCard/ProjectCard'
import LiquidGlassBackdrop from '../../components/ui/LiquidGlassProjectCard/LiquidGlassBackdrop'
import { projects } from '../../data/projects'
import { useTransitionReady } from '../../transitions/core/TransitionControls'
import { useHomeProjectMotion } from './useHomeProjectMotion'
import styles from './HomePage.module.css'

const categories = ['Alle', 'IT', 'Fotografie', 'Kunst', 'Videografie'] as const

function HomePage() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Alle')
  const [portraitActive, setPortraitActive] = useState(true)
  const projectSection = useRef<HTMLElement>(null)
  const projectContent = useRef<HTMLDivElement>(null)
  useHomeProjectMotion(projectSection, projectContent, setPortraitActive)
  const [portraitReady] = useState(() => {
    let resolve: () => void = () => {}
    const promise = new Promise<void>((done) => { resolve = done })
    return { promise, resolve }
  })
  useTransitionReady(portraitReady.promise)

  useEffect(() => {
    const bodyBackground = document.body.style.backgroundColor
    const rootBackground = document.documentElement.style.backgroundColor
    document.body.style.backgroundColor = '#ffffff'
    document.documentElement.style.backgroundColor = '#ffffff'
    return () => {
      document.body.style.backgroundColor = bodyBackground
      document.documentElement.style.backgroundColor = rootBackground
    }
  }, [])

  const selected = projects.filter((project) => category === 'Alle' || project.category.startsWith(category))

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="portfolio-name">
        <header className={styles.header}>
          <h1 id="portfolio-name" className={styles.name}><Link to="/">Pascals Portfolio</Link></h1>
          <Link to="/" className={styles.logo} aria-label="Pascals Portfolio – Startseite"><img src="/images/LogoPP.png" width="84" height="84" alt="Logo PP" fetchPriority="high" /></Link>
          <Link to="#projekte" className={styles.headerLink}>Projekte <span aria-hidden="true">↘</span></Link>
        </header>
        <div className={styles.portraitStage}>
          <div className={styles.portraitFrame}><DepthPortrait assets={PORTRAIT_ASSETS} onReady={portraitReady.resolve} active={portraitActive} /></div>
        </div>
        <div className={styles.heroFooter}>
          <Link to="#projekte" className={styles.scrollHint}>Scrollen & entdecken <span aria-hidden="true">↓</span></Link>
        </div>
      </section>

      <section ref={projectSection} id="projekte" className={styles.projects} aria-labelledby="projects-title">
        <LiquidGlassBackdrop containerRef={projectSection} />
        <div className={styles.sheetHandle} aria-hidden="true" />
        <div ref={projectContent} className={styles.projectInner}>
          <div className={styles.projectHeader} data-project-reveal>
            <div><p className={styles.eyebrow}>AUSGEWÄHLTE ARBEITEN</p><h2 id="projects-title">Meine Projekte<span>.</span></h2></div>
            <Link to="/it" className={styles.labLink}>IT & Vibe Coding entdecken <span aria-hidden="true">↗</span></Link>
          </div>
          <div className={styles.projectToolbar} data-project-reveal>
            <div className={styles.filters} role="group" aria-label="Projekte nach Bereich filtern">
              {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} className={`${styles.filter} ${category === item ? styles.activeFilter : ''}`} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <span className={styles.resultCount} aria-live="polite">{String(selected.length).padStart(2, '0')} Projekte</span>
          </div>
          <div className={styles.projectGrid}>
            {selected.map((project) => <ProjectCard key={project.id} {...project} variant="glass" index={projects.indexOf(project) + 1} />)}
          </div>
          <footer className={styles.footer} data-project-reveal><span>Pascals Portfolio</span><Link to="/">Zurück nach oben <span aria-hidden="true">↑</span></Link></footer>
        </div>
      </section>
    </main>
  )
}

export default HomePage
