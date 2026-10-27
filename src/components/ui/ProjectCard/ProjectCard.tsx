
import { Link } from 'react-router'
import styles from './ProjectCard.module.css'

type ProjectCardProps = {
  title: string
  category: string
  description: string
  status: string
  image?: string
  path?: string
  variant?: 'default' | 'terminal'
  index?: number
}

function ProjectCard({
  title,
  category,
  description,
  status,
  image,
  path,
  variant = 'default',
  index = 1,
}: ProjectCardProps) {

  if (variant === 'terminal') {
    const terminalContent = (
      <>
        <div className={styles.terminalPreview}>
          <span className={styles.previewLabel}>EXPERIMENT_{String(index).padStart(2, '0')}</span>
          {image ? (
            <img src={image} alt={`Vorschaubild: ${title}`} loading="lazy" className={styles.terminalImage} />
          ) : (
            <div className={styles.wireframe} aria-hidden="true"><span /><span /><span /><i /></div>
          )}
          <span className={styles.previewCaption}>{image ? 'interactive / web' : 'work in progress_'}</span>
          <span className={`${styles.terminalStatus} ${status === 'Fertig' ? styles.completed : ''}`}><i />{status}</span>
        </div>
        <div className={styles.terminalBody}>
          <div className={styles.terminalCategory}><span>{category.replace(/^IT\s*\/\s*/, '')}</span><span>{String(index).padStart(2, '0')}</span></div>
          <h3 className={styles.terminalTitle}>{title}{path && <span aria-hidden="true">↗</span>}</h3>
          <p className={styles.terminalDescription}>{description}</p>
          <div className={styles.terminalFooter}><span aria-hidden="true">&lt;/&gt;</span><span>{path ? 'Projekt ansehen' : 'In Planung'}{path && <span aria-hidden="true"> →</span>}</span></div>
        </div>
      </>
    )

    return path ? (
      <Link to={path} className={styles.terminalCard}>{terminalContent}</Link>
    ) : (
      <article className={styles.terminalCard}>{terminalContent}</article>
    )
  }

  const content = (
    <>
      <div className={styles.preview}>
        {image ? (
          <img
            src={image}
            alt={`Vorschaubild: ${title}`}
            className={styles.previewImage}
            loading="lazy"
          />
        ) : (
          <span className={styles.placeholder}>
            Projektvorschau
          </span>
        )}
      </div>

      <div className={styles.header}>
        <span className={styles.category}>
          {category}
        </span>

        <span className={styles.status}>
          {status}
        </span>
      </div>

      <h3 className={styles.title}>
        {title}
      </h3>

      <p className={styles.description}>
        {description}
      </p>
    </>
  )

  // Mit Projektseite: anklickbarer Link
  if (path) {
    return (
      <Link to={path} className={styles.card}>
        {content}
      </Link>
    )
  }

  // Ohne Projektseite: normale Karte
  return (
    <article className={styles.card}>
      {content}
    </article>
  )
}

export default ProjectCard
