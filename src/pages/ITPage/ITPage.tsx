
import { Link } from 'react-router'

import ProjectCard from '../../components/ui/ProjectCard/ProjectCard'
import { projects } from '../../data/projects'

// Eigenes Design für diese Seite
import styles from './ITPage.module.css'

function ITPage() {

  const itProjects = projects.filter((project) =>
    project.category.startsWith('IT')
  )

  return (
    <main className={styles.page}>

      <p className={styles.kicker}>
        MY DIGITAL LAB
      </p>

      <h1 className={styles.title}>
        IT & Webdesign
      </h1>

      <p className={styles.description}>
        Hier sammle ich meine programmierten Websites,
        interaktiven Experimente und Fortschritte
        in der Webentwicklung.
      </p>

      <Link to="/" className={styles.backLink}>
        ← Zurück zur Startseite
      </Link>

      <section className={styles.projects}>

        <h2 className={styles.sectionTitle}>
          Meine IT-Projekte
        </h2>

        <div className={styles.projectGrid}>

          {itProjects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              category={project.category}
              description={project.description}
              status={project.status}
              image={project.image}
              path={project.path}
            />
          ))}

        </div>
      </section>
    </main>
  )
}

export default ITPage
