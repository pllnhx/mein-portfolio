import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createDepthPortrait } from './createDepthPortrait'
import type { DepthPortraitHandle } from './createDepthPortrait'
import type { PortraitAssets } from './portraitAssets'
import { PORTRAIT_SETTINGS } from './portraitAssets'
import styles from './DepthPortrait.module.css'

export default function DepthPortrait({ assets, onReady, active = true }: { assets: PortraitAssets; onReady: () => void; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<DepthPortraitHandle | null>(null)
  const enabled = useRef(active)
  const [renderer, setRenderer] = useState<'image' | 'webgl'>('image')

  useEffect(() => { enabled.current = active; sceneRef.current?.setActive(active) }, [active])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let controller: AbortController | null = null
    let handle: DepthPortraitHandle | null = null
    let disposed = false
    const fallback = () => { if (!disposed) setRenderer('image') }
    const start = () => {
      controller?.abort()
      handle?.dispose()
      sceneRef.current = null
      controller = new AbortController()
      const signal = controller.signal
      fallback()
      if (media.matches) { onReady(); return }
      void createDepthPortrait(element, assets, signal).then((scene) => {
        if (signal.aborted || disposed) { scene?.dispose(); return }
        handle = scene
        sceneRef.current = scene
        if (scene) { scene.setActive(enabled.current); setRenderer('webgl') }
      }).catch((error: unknown) => {
        if (!signal.aborted) {
          if (import.meta.env.DEV) console.warn('[DepthPortrait] Animation konnte nicht gestartet werden:', error)
          fallback()
        }
      }).finally(() => { if (!disposed && !signal.aborted) onReady() })
    }
    media.addEventListener('change', start)
    element.addEventListener('portrait-fallback', fallback)
    element.addEventListener('webglcontextrestored', start)
    start()
    return () => {
      disposed = true
      controller?.abort()
      handle?.dispose()
      sceneRef.current = null
      media.removeEventListener('change', start)
      element.removeEventListener('portrait-fallback', fallback)
      element.removeEventListener('webglcontextrestored', start)
    }
  }, [assets, onReady])

  const mask = { maskImage: `url("${assets.alpha}")`, WebkitMaskImage: `url("${assets.alpha}")`, maskMode: 'luminance', maskSize: '100% 100%', WebkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' } as CSSProperties
  const gutter = PORTRAIT_SETTINGS.gutter * 100
  const canvasSize = { top: `${-gutter}%`, left: `${-gutter}%`, width: `${100 + gutter * 2}%`, height: `${100 + gutter * 2}%` }
  return (
    <figure className={styles.portrait} data-renderer={renderer} data-depth-portrait>
      <img className={styles.fallback} style={mask} src={assets.photo} width="1048" height="931" alt="Pascal mit Skihelm und verspiegeltem Visier in den Bergen" fetchPriority="high" decoding="async" />
      <canvas ref={canvas} className={styles.canvas} style={canvasSize} aria-hidden="true" />
      <figcaption className={styles.caption}>Ein Porträt mit mausgesteuerter Tiefe und Lichtreflexion im Visier.</figcaption>
    </figure>
  )
}
