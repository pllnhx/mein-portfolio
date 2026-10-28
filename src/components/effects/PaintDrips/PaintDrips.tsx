import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

import styles from './PaintDrips.module.css'

type PaintDripsProps = {
  anchorRef: RefObject<HTMLImageElement | null>
}

type Anchor = { x: number; y: number }
type Drop = Anchor & { id: number; distance: number }

// Find the actual opaque bottom of the generated T, including its transparent margin.
function findPaintEdge(image: HTMLImageElement): Anchor {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !image.naturalWidth) return { x: .5, y: .86 }

  try {
    context.drawImage(image, 0, 0, 128, 128)
    const pixels = context.getImageData(0, 0, 128, 128).data
    for (let y = 124; y > 50; y--) {
      const opaque: number[] = []
      for (let x = 25; x < 103; x++) {
        if (pixels[(y * 128 + x) * 4 + 3] > 145) opaque.push(x)
      }
      if (opaque.length > 3) {
        return { x: opaque.reduce((sum, x) => sum + x, 0) / opaque.length / 128, y: y / 128 }
      }
    }
  } catch {
    // Geometry still provides a useful anchor if a future externally hosted image disallows pixels.
  }
  return { x: .5, y: .86 }
}

function PaintDrips({ anchorRef }: PaintDripsProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const image = anchorRef.current
    if (!image) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let paintEdge = findPaintEdge(image)
    let frame = 0
    let interval: number | undefined
    let nextId = 0

    const measure = (): Anchor => {
      const rect = image.getBoundingClientRect()
      const naturalRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1
      const width = Math.min(rect.width, rect.height * naturalRatio)
      const height = width / naturalRatio
      return {
        x: rect.left + (rect.width - width) / 2 + width * paintEdge.x,
        y: rect.top + (rect.height - height) / 2 + height * paintEdge.y - 1,
      }
    }

    const updateAnchor = () => {
      frame = 0
      if (!reducedMotion.matches && !document.hidden) setAnchor(measure())
    }
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(updateAnchor)
    }
    const onLoad = () => {
      paintEdge = findPaintEdge(image)
      scheduleMeasure()
    }
    const reset = () => {
      window.clearInterval(interval)
      interval = undefined
      setDrop(null)
      if (reducedMotion.matches || document.hidden) {
        setAnchor(null)
        return
      }
      scheduleMeasure()
      interval = window.setInterval(() => {
        const current = measure()
        if (current.y < 0 || current.y > window.innerHeight) return
        setAnchor(current)
        setDrop({ ...current, id: ++nextId, distance: Math.max(180, window.innerHeight - current.y + 30) })
      }, 5000)
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(image)
    image.addEventListener('load', onLoad)
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    document.addEventListener('visibilitychange', reset)
    reducedMotion.addEventListener('change', reset)
    reset()

    return () => {
      window.clearInterval(interval)
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      image.removeEventListener('load', onLoad)
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure)
      document.removeEventListener('visibilitychange', reset)
      reducedMotion.removeEventListener('change', reset)
    }
  }, [anchorRef])

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      {anchor && <span className={styles.bead} style={{ left: anchor.x, top: anchor.y }} />}
      {drop && (
        <span
          key={drop.id}
          className={styles.drop}
          style={{ left: drop.x, top: drop.y, '--drop-distance': `${drop.distance}px` } as CSSProperties}
          onAnimationEnd={() => setDrop(null)}
        />
      )}
    </div>
  )
}

export default PaintDrips
