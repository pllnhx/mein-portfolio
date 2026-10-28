import { useState } from 'react'
import { Link } from 'react-router'

import ProjectCard from '../../components/ui/ProjectCard/ProjectCard'
import { projects } from '../../data/projects'
import { BinaryMouseTrail, CodeBackground, GlitchTitle, PageEffects } from './TerminalEffects'
import styles from './ITPage.module.css'

const itProjects = projects.filter((project) => project.category.startsWith('IT'))
const filters = ['Alle Projekte', 'Fertig', 'Geplant'] as const

function ITPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('Alle Projekte')
  const [activeFile, setActiveFile] = useState<'about.ts' | 'stack.json'>('about.ts')
  const visibleProjects = itProjects.filter((project) =>
    filter === 'Alle Projekte' || project.status === filter,
  )

  return (
    <main className={styles.page}>
      <CodeBackground />
      <BinaryMouseTrail />
      <PageEffects className={styles.container}>
        <nav className={styles.navigation} aria-label="Seitennavigation">
          <Link to="/" className={styles.homeLink} aria-label="Zurück zur Startseite">
            <span className={styles.logo} aria-hidden="true">p<span>_</span></span>
            <span>pascal<span className={styles.path}> / portfolio</span></span>
          </Link>
          <span className={styles.navLocation}><span>~/</span> it & vibe coding</span>
          <Link to="#projekte" className={styles.navLink}>Projekte <span aria-hidden="true">↗</span></Link>
        </nav>

        <section className={styles.hero} aria-labelledby="it-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><span className={styles.statusDot} /> MY DIGITAL LAB <span className={styles.kickerIndex}>// 01</span></p>
            <GlitchTitle />
            <p className={styles.description}>Ideen werden Code.<br />Und Code wird etwas, das bleibt.</p>
            <p className={styles.introduction}>Mein Raum für Webentwicklung, interaktive Experimente und die Neugier, Neues zu bauen.</p>
            <Link to="#projekte" className={styles.primaryLink}>Projekte entdecken <span aria-hidden="true">↘</span></Link>
            <div className={styles.heroMeta}>
              <span><span className={styles.statusDot} /> </span>
              <span>build. break. learn. repeat.</span>
            </div>
          </div>

          <div className={styles.editor}>
            <div className={styles.editorBar}>
              <span className={styles.windowControls} aria-hidden="true"><i /><i /><i /></span>
              <span>~/portfolio/lab</span><span className={styles.editorIcon} aria-hidden="true">⌘</span>
            </div>
            <div className={styles.fileTabs} role="tablist" aria-label="Code-Vorschau">
              {(['about.ts', 'stack.json'] as const).map((file) => (
                <button
                  key={file} type="button" role="tab" id={`tab-${file}`}
                  aria-selected={activeFile === file} aria-controls="code-preview"
                  className={`${styles.fileTab} ${activeFile === file ? styles.activeFile : ''}`}
                  onClick={() => setActiveFile(file)}
                  onKeyDown={(event) => {
                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                      event.preventDefault()
                      const next = event.key === 'Home' ? 'about.ts' : event.key === 'End' ? 'stack.json' : activeFile === 'about.ts' ? 'stack.json' : 'about.ts'
                      setActiveFile(next)
                      document.getElementById(`tab-${next}`)?.focus()
                    }
                  }}
                  tabIndex={activeFile === file ? 0 : -1}
                >
                  <span className={file === 'about.ts' ? styles.fileType : styles.jsonType} aria-hidden="true">{file === 'about.ts' ? 'TS' : '{ }'}</span> {file}
                  {activeFile === file && <span className={styles.fileDot} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div id="code-preview" role="tabpanel" aria-labelledby={`tab-${activeFile}`} tabIndex={0} className={styles.codePreview}>
              {activeFile === 'about.ts' ? (
                <pre><code><span className={styles.comment}>// Aus Neugier wird Wirklichkeit.</span>{'\n\n'}<span className={styles.keyword}>const</span> developer = {'{'}{'\n'}{'  '}name: <span className={styles.string}>'Pascal'</span>,{'\n'}{'  '}focus: <span className={styles.string}>'Creative Development'</span>,{'\n'}{'  '}mindset: <span className={styles.string}>'Always learning'</span>{'\n'}{'};'}{'\n\n'}<span className={styles.keyword}>while</span> (curious) {'{'}{'\n'}{'  '}<span className={styles.function}>explore</span>();{'\n'}{'  '}<span className={styles.function}>build</span>();{'\n'}{'  '}<span className={styles.function}>improve</span>();{'\n'}{'}'}</code></pre>
              ) : (
                <pre><code>{'{'}{'\n'}{'  '}<span className={styles.string}>"frontend"</span>: [{'\n'}{'    '}<span className={styles.string}>"React"</span>,{'\n'}{'    '}<span className={styles.string}>"TypeScript"</span>,{'\n'}{'    '}<span className={styles.string}>"CSS Modules"</span>{'\n'}{'  '}],{'\n'}{'  '}<span className={styles.string}>"tooling"</span>: <span className={styles.string}>"Vite"</span>,{'\n'}{'  '}<span className={styles.string}>"next"</span>: <span className={styles.string}>"Neue Ideen ausprobieren"</span>{'\n'}{'}'}</code></pre>
              )}
            </div>
            <div className={styles.editorStatus}><span><span className={styles.statusDot} /> All systems curious</span><span>{activeFile === 'about.ts' ? 'TypeScript' : 'JSON'} <span aria-hidden="true">⌁</span></span></div>
          </div>
        </section>

        <div className={styles.stackStrip} aria-label="Technologien">
          <span className={styles.stackLabel}>BUILT WITH CURIOSITY</span>
          <span>React</span><span>TypeScript</span><span>Vite</span><span>CSS Modules</span>
          <span className={styles.stackEnd} aria-hidden="true">&lt;/&gt;</span>
        </div>

        <section id="projekte" className={styles.projects} aria-labelledby="projects-title">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>// SELECTED WORK</p>
              <h2 id="projects-title" className={styles.sectionTitle}><span aria-hidden="true">./</span> Meine Projekte<span className={styles.projectCount}>[{String(itProjects.length).padStart(2, '0')}]</span></h2>
            </div>
            <span className={styles.sectionNote}></span>
          </div>
          <div className={styles.filters} role="group" aria-label="Projekte nach Status filtern">
            {filters.map((item) => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`${styles.filter} ${filter === item ? styles.activeFilter : ''}`}>
                {item}<span>{String(item === 'Alle Projekte' ? itProjects.length : itProjects.filter((project) => project.status === item).length).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
          <div className={styles.projectGrid}>
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} {...project} variant="terminal" index={itProjects.indexOf(project) + 1} />
            ))}
            {visibleProjects.length === 0 && <p className={styles.emptyState}>Hier entstehen bald neue Projekte.</p>}
          </div>
        </section>

        <footer className={styles.footer}>
          <span><span className={styles.footerPrompt}>&gt;_</span> Mit Neugier gebaut. Von Pascal.</span>
          <Link to="/">Zurück zur Startseite <span aria-hidden="true">↗</span></Link>
        </footer>
      </PageEffects>
    </main>
  )
}

export default ITPage
