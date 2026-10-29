import { Link } from 'react-router'
import type { Project } from '../../../data/projects'
import styles from './LiquidGlassProjectCard.module.css'

type Props = Omit<Project, 'id'> & { index?: number }

export default function LiquidGlassProjectCard({ title, category, description, status, image, path, index = 1 }: Props) {
  const content = (
    <>
      <div className={styles.topRow} data-project-reveal>
        <div className={styles.preview}>
          {image ? <img src={image} alt={`Vorschaubild: ${title}`} width="168" height="168" loading="lazy" decoding="async" /> : <div className={`${styles.abstractPreview} ${category.startsWith('IT') ? styles.technical : ''}`} aria-hidden="true"><i /><i /><i /></div>}
        </div>
        <div className={styles.identity}><span className={styles.projectNumber}>{String(index).padStart(2, '0')}</span><span className={styles.category}>{category.replace(/^IT\s*\/\s*/, '')}</span></div>
      </div>
      <div className={styles.body} data-project-reveal>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.footer} data-project-reveal>
        <div><span className={`${styles.status} ${status === 'Fertig' ? styles.complete : ''}`}><i aria-hidden="true" />{status}</span><span className={styles.cta}>{path ? 'Projekt entdecken' : status === 'Geplant' ? 'Demnächst' : 'Ein Einblick'}</span></div>
        <span className={styles.arrow} aria-hidden="true">{path ? '↗' : '—'}</span>
      </div>
    </>
  )
  const properties = { className: styles.card, 'data-liquid-glass-card': '' }
  return path ? <Link to={path} {...properties}>{content}</Link> : <article {...properties}>{content}</article>
}
