import { useId } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router'
import type { Project } from '../../../data/projects'
import styles from './LiquidGlassProjectCard.module.css'

type Props = Omit<Project, 'id'> & { index?: number }

export default function LiquidGlassProjectCard({ title, category, description, status, image, path, index = 1 }: Props) {
  const filter = `glass-${useId().replace(/:/g, '')}`
  const trackLight = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--light-x', `${(event.clientX - bounds.left) / bounds.width * 100}%`)
    event.currentTarget.style.setProperty('--light-y', `${(event.clientY - bounds.top) / bounds.height * 100}%`)
  }
  const content = (
    <>
      <svg className={styles.filterDefinitions} aria-hidden="true" width="0" height="0"><defs>
        <filter id={filter} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.024" numOctaves="2" seed={index + 2} result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.6" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs></svg>
      <div className={styles.preview}>
        {image ? <img src={image} alt={`Vorschaubild: ${title}`} width="720" height="450" loading="lazy" decoding="async" /> : <div className={`${styles.abstractPreview} ${category.startsWith('IT') ? styles.technical : ''}`} aria-hidden="true"><i /><i /><i /></div>}
        <span className={styles.projectNumber}>{String(index).padStart(2, '0')}</span>
        <span className={`${styles.status} ${status === 'Fertig' ? styles.complete : ''}`}><i />{status}</span>
      </div>
      {image && <div className={styles.refractedEdge} aria-hidden="true"><img src={image} alt="" loading="lazy" style={{ filter: `url(#${filter})` }} /></div>}
      <div className={styles.glassSurface} aria-hidden="true" />
      <div className={styles.body}>
        <span className={styles.category}>{category.replace(/^IT\s*\/\s*/, '')}</span>
        <h3>{title}{path && <span className={styles.arrow} aria-hidden="true">↗</span>}</h3>
        <p>{description}</p>
        <div className={styles.footer}><span>{path ? 'Projekt entdecken' : status === 'Geplant' ? 'Demnächst' : 'Ein Einblick'}</span><span aria-hidden="true">{path ? '↗' : '—'}</span></div>
      </div>
      <div className={styles.rim} aria-hidden="true" />
    </>
  )
  return path ? <Link to={path} className={styles.card} onPointerMove={trackLight}>{content}</Link> : <article className={styles.card} onPointerMove={trackLight}>{content}</article>
}
