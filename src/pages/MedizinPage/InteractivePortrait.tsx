import { useId, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import styles from './MedizinPage.module.css'

function InteractivePortrait() {
  const descriptionId = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [keyboardPreview, setKeyboardPreview] = useState(false)
  const [pinned, setPinned] = useState(false)
  const active = hovered || keyboardPreview || pinned

  function moveScan(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'touch' || !wrap.current?.closest('[data-motion="active"]')) return
    const bounds = plane.current?.getBoundingClientRect()
    if (!bounds) return
    if (!bounds.width || !bounds.height) return
    const x = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))
    const y = Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100))
    wrap.current.style.setProperty('--scan-x', `${x}%`)
    wrap.current.style.setProperty('--scan-y', `${y}%`)
  }

  function close() {
    setPinned(false)
    setHovered(false)
    setKeyboardPreview(false)
  }

  return (
    <figure className={styles.heroFigure}>
      <div ref={wrap} className={styles.heroImageWrap} data-vascular-active={active} data-pinned={pinned}>
        <span className={styles.heroOrbit} data-pointer="12" aria-hidden="true" />
        <div ref={plane} className={styles.portraitPlane} data-parallax="18" data-pointer="9">
          <img
            src="/medizin/portrait-placeholder.svg"
            width="900" height="1100"
            alt="Abstrakte skulpturale Kopfstudie als Bildplatzhalter"
            className={styles.heroImage}
            fetchPriority="high"
          />
          <img className={styles.vascularOverlay} src="/medizin/vascular-overlay.svg" width="900" height="1100" alt="" aria-hidden="true" />
          <img className={styles.vascularLens} src="/medizin/vascular-overlay.svg" width="900" height="1100" alt="" aria-hidden="true" />
          <span className={styles.scanReticle} aria-hidden="true"><i /><i /><span>+</span></span>
        </div>
        <span className={styles.imageCross} data-pointer="-10" aria-hidden="true">+</span>
        <span className={styles.scanLabel} aria-hidden="true"><i />Gefäßansicht / Schematisch</span>
        <button
          type="button"
          className={styles.portraitControl}
          aria-label="Gefäßansicht fixieren"
          aria-pressed={pinned}
          aria-describedby={descriptionId}
          onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(true) }}
          onPointerMove={moveScan}
          onPointerLeave={() => {
            setHovered(false)
            wrap.current?.style.removeProperty('--scan-x')
            wrap.current?.style.removeProperty('--scan-y')
          }}
          onFocus={(event) => setKeyboardPreview(event.currentTarget.matches(':focus-visible'))}
          onBlur={() => setKeyboardPreview(false)}
          onClick={() => {
            if (pinned) close()
            else setPinned(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); close() }
          }}
        >
          <span className={styles.imageTag}>
            <span className={styles.scanButtonIcon} aria-hidden="true">{pinned ? '−' : '+'}</span>
            <span>{pinned ? 'Ansicht lösen' : 'Unter die Oberfläche'}</span>
          </span>
          <span className={styles.portraitHint} aria-hidden="true">
            <span className={styles.mouseHint}>{pinned ? 'Gefäßansicht fixiert' : 'Maus bewegen · Klicken zum Fixieren'}</span>
            <span className={styles.touchHint}>{pinned ? 'Erneut tippen zum Schließen' : 'Antippen zum Erkunden'}</span>
          </span>
        </button>
      </div>
      <figcaption><span>01 / Interaktive Bildstudie</span><span>Bildplatzhalter</span></figcaption>
      <p id={descriptionId} className={styles.srOnly}>Schematische Gefäßansicht als Designstudie. Mit der Maus oder Tastaturfokus ansehen, mit Enter oder Tippen fixieren und lösen. Escape schließt die Ansicht.</p>
    </figure>
  )
}

export default InteractivePortrait
