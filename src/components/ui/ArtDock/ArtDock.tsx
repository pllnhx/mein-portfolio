import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { artCategories } from '../../../data/art'
import styles from './ArtDock.module.css'

export default function ArtDock() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined

    // Keep WebGL out of the initial portfolio bundle and preserve native links
    // if the browser cannot create a rendering context.
    import('./artDockScene').then(({ mountArtDock }) => {
      if (cancelled || !canvasRef.current || !navigationRef.current) return
      dispose = mountArtDock(canvasRef.current, navigationRef.current, setReady)
    }).catch(() => {
      if (!cancelled) setReady(false)
    })

    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  useEffect(() => {
    const revealCategory = () => {
      const navigation = navigationRef.current
      if (!navigation) return
      const active = navigation.querySelector<HTMLAnchorElement>('[aria-current="page"]')
      const target = active ? active.offsetLeft - (navigation.clientWidth - active.clientWidth) / 2 : 0
      navigation.scrollTo({ left: Math.max(0, target), behavior: 'instant' })
    }
    revealCategory()
    window.addEventListener('resize', revealCategory)
    return () => window.removeEventListener('resize', revealCategory)
  }, [pathname])

  return (
    <div className={styles.dock} data-ready={ready}>
      <div className={styles.shelf} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <nav ref={navigationRef} className={styles.viewport} aria-label="Kunsttechniken – wähle dein Werkzeug">
        <div className={styles.items}>
          {artCategories.map((category) => (
            <NavLink
              key={category.id}
              to={category.path}
              className={styles.item}
              aria-label={`${category.title} ansehen`}
              data-art-tool={category.tool}
            >
              <span className={styles.fallbackTool} aria-hidden="true">{category.title.slice(0, 1)}</span>
              <span className={styles.label}>{category.title}</span>
              <span className={styles.activeMark} aria-hidden="true" />
            </NavLink>
          ))}
        </div>
      </nav>
      <span className={styles.instruction} aria-hidden="true">Ein Werkzeug. Eine neue Perspektive.</span>
    </div>
  )
}
