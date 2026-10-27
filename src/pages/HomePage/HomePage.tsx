
import { Link } from 'react-router'

import MouseGlowBackground from '../../components/effects/MouseGlowBackground/MouseGlowBackground'
import ProjectCard from '../../components/ui/ProjectCard/ProjectCard'
import { projects } from '../../data/projects'

import styles from './HomePage.module.css'

function HomePage() {
  return (
    <>
      <MouseGlowBackground
        color="#606787"
        size={40}
        speed={0.08}
      />

      <main className={styles.page}>

        <p className={styles.kicker}>
          WELCOME TO MY WORLD
        </p>

        <h1 className={styles.title}>
          Pascal's Portfolio
        </h1>

        <p className={styles.description}>
          Willkommen auf meiner persönlichen Website.
          Hier sammle ich meine Projekte, Fähigkeiten
          und kreativen Experimente.
        </p>

        <section>
          <h2 className={styles.sectionTitle}>
            Meine Projekte
          </h2>

          <p>
            <Link
              to="/it"
              className={styles.categoryLink}
            >
              IT & Webdesign entdecken →
            </Link>
          </p>

          <div className={styles.projectGrid}>
            {projects.map((project) => (
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
    </>
  )
}

export default HomePage
