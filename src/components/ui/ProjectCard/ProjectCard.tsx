
import { Link } from 'react-router'
import styles from './ProjectCard.module.css'

type ProjectCardProps = {
  title: string
  category: string
  description: string
  status: string
  image?: string
  path?: string
}

function ProjectCard({
  title,
  category,
  description,
  status,
  image,
  path
}: ProjectCardProps) {

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
