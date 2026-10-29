import { Link, useParams } from 'react-router'

import { artCategories, artworks } from '../../data/art'
import styles from './ArtPage.module.css'

function ArtGalleryPage() {
  const { category } = useParams<{ category: string }>()
  const selectedCategory = artCategories.find((item) => item.id === category)
  const selectedWorks = artworks.filter((artwork) => artwork.category === selectedCategory?.id)

  if (!selectedCategory) {
    return (
      <section className={styles.gallery} aria-labelledby="gallery-title">
        <Link to="/art" className={styles.overviewLink}><span aria-hidden="true">←</span> Zur Kunstübersicht</Link>
        <p className={styles.eyebrow}>PASCAL / ATELIER / 404</p>
        <h1 id="gallery-title" className={styles.galleryTitle}>Hier ist noch<br />ein weißes Blatt.</h1>
        <p className={styles.galleryDescription}>Diese Galerie gibt es nicht. In der Kunstübersicht findest du alle sieben Techniken.</p>
        <Link to="/art" className={styles.textLink}>Kunst entdecken <span aria-hidden="true">↗</span></Link>
      </section>
    )
  }

  const index = String(artCategories.indexOf(selectedCategory) + 1).padStart(2, '0')

  return (
    <section className={styles.gallery} aria-labelledby="gallery-title">
      <Link to="/art" className={styles.overviewLink}><span aria-hidden="true">←</span> Zur Kunstübersicht</Link>
      <div className={styles.galleryHeading}>
        <div>
          <p className={styles.eyebrow}>PASCAL / ATELIER <span className={styles.galleryIndex}>/ {index}</span></p>
          <h1 id="gallery-title" className={styles.galleryTitle}>{selectedCategory.title}<span className={styles.titlePeriod}>.</span></h1>
          <p className={styles.galleryDescription}>{selectedCategory.description}</p>
        </div>
        <span className={styles.galleryMedium} aria-hidden="true">{index}<span> / 07</span></span>
      </div>

      {selectedWorks.length ? (
        <div className={styles.artworkGrid}>
          {selectedWorks.map((artwork) => (
            <figure key={artwork.id} className={styles.artwork}>
              <img src={artwork.image} alt={artwork.alt} loading="lazy" />
              <figcaption>{artwork.title}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptySketch} aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p className={styles.emptyKicker}>NOCH EIN WEISSES BLATT</p>
            <h2>Hier finden bald Werke ihren Platz.</h2>
            <p>Die Galerie für {selectedCategory.title} ist vorbereitet.<br />Eigene Arbeiten folgen.</p>
          </div>
          <span className={styles.emptySignature} aria-hidden="true">in Arbeit</span>
        </div>
      )}

      <div className={styles.galleryFooter}>
        <Link to="/art" className={styles.textLink}>Alle Techniken <span aria-hidden="true">↗</span></Link>
        <Link to="/" className={styles.galleryHome}>Zurück zur Startseite</Link>
      </div>
    </section>
  )
}

export default ArtGalleryPage
