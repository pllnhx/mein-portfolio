import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { createGlassBackdrop } from './createGlassBackdrop'
import { GLASS_GRID } from './glassGeometry'

export default function LiquidGlassBackdrop({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return
    containerRef.current.style.setProperty('--glass-grid', `${GLASS_GRID}px`)
    return createGlassBackdrop(canvasRef.current, containerRef.current)
  }, [containerRef])
  return <canvas ref={canvasRef} data-glass-canvas aria-hidden="true" style={{ position: 'absolute', inset: '0 auto auto 0', display: 'block', width: '100%', height: 0, pointerEvents: 'none', zIndex: 0 }} />
}
