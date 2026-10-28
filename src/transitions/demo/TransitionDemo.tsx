import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router'
import { TransitionEngine } from '../core/TransitionEngine'
import { transitionRegistry } from '../registry'
import { afterPaint } from '../core/async'
import type { TransitionDirection } from '../types'
import styles from './TransitionDemo.module.css'

export default function TransitionDemo() {
  const [engine] = useState(() => new TransitionEngine(transitionRegistry))
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const source = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState('home')
  const [duration, setDuration] = useState(2.4)
  const [density, setDensity] = useState(.85)
  const [speed, setSpeed] = useState(1)
  const [glitchStrength, setGlitchStrength] = useState(.45)
  const [revealDuration, setRevealDuration] = useState(1.15)
  const navigate = useNavigate()
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => { if (media.matches) engine.cancel() }
    media.addEventListener('change', changed)
    return () => { media.removeEventListener('change', changed); engine.dispose() }
  }, [engine])

  const play = (direction: TransitionDirection) => {
    if (engine.busy || !source.current || !host.current || !backdrop.current || !mount.current) return
    const from = direction === 'enter' ? '/preview' : '/it'
    const to = direction === 'enter' ? '/it' : '/preview'
    flushSync(() => setScene(direction === 'enter' ? 'home' : 'it'))
    void engine.run({
      source: source.current, host: host.current, backdrop: backdrop.current, mount: mount.current,
      from: { pathname: from }, to: { pathname: to }, action: 'PUSH', selection: { id: 'it', direction },
      duration, settings: { density, speed, glitchStrength, revealDuration, showSuccess: true },
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      commit: async () => { flushSync(() => setScene(direction === 'enter' ? 'it' : 'home')) },
      ready: afterPaint,
    })
  }
  const reset = () => { engine.cancel(); setScene('home') }
  const controls = [
    { label: 'Dauer', value: duration, set: setDuration, min: .6, max: 5, step: .1, unit: ' s' },
    { label: 'Matrix-Dichte', value: density, set: setDensity, min: .2, max: 1.8, step: .05, unit: '' },
    { label: 'Geschwindigkeit', value: speed, set: setSpeed, min: .2, max: 3, step: .1, unit: '×' },
    { label: 'Glitch-Stärke', value: glitchStrength, set: setGlitchStrength, min: 0, max: 1, step: .05, unit: '' },
    { label: 'Reveal-Dauer', value: revealDuration, set: setRevealDuration, min: .2, max: 3, step: .05, unit: ' s' },
  ]
  return (
    <main className={styles.page}>
      <Link to="/">← Portfolio</Link>
      <h1>Transition Lab</h1>
      <p>Isolierte IT-Vorschau mit derselben Engine und demselben Modul wie die Seitennavigation. Einstellungen gelten für den nächsten Durchlauf.</p>
      <div className={styles.layout}>
        <div>
          <div className={styles.stage}>
            <div ref={source} className={styles.scene} data-scene={scene}>
              <span>{scene === 'it' ? '~/ DIGITAL LAB' : '~/ PORTFOLIO'}</span>
              <h2>{scene === 'it' ? '>_ IT & Vibe Coding' : 'Ein neuer Blickwinkel.'}</h2>
              <p>{scene === 'it' ? 'Die Zielseite ist bereits hinter der Matrix gemountet.' : 'Ein neutraler Ausgangspunkt für die Vorschau.'}</p>
            </div>
            <div ref={host} className={styles.host} aria-hidden="true"><div ref={backdrop} className={styles.backdrop} /><div ref={mount} className={styles.mount} /></div>
          </div>
          <div className={styles.buttons}>
            <button type="button" disabled={engine.busy} onClick={() => play('enter')}>IT Enter</button>
            <button type="button" disabled={engine.busy} onClick={() => play('leave')}>IT Leave</button>
            <button type="button" onClick={reset}>Reset</button>
          </div>
          <div className={styles.state} role="status">{snapshot.phase} · {snapshot.direction ?? 'bereit'}{snapshot.error && ` · ${snapshot.error}`}</div>
        </div>
        <aside className={styles.panel} aria-label="Transition Debug-Panel">
          <h2>Debug-Panel</h2>
          {controls.map((control) => <label key={control.label} className={styles.control}><span>{control.label}<output>{control.value.toFixed(2)}{control.unit}</output></span><input type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={(event) => control.set(Number(event.target.value))} /></label>)}
          <label className={styles.control}><span>Reveal-Fortschritt<output>{Math.round(snapshot.revealProgress * 100)} %</output></span><input type="range" min="0" max="100" value={Math.round(snapshot.revealProgress * 100)} disabled={snapshot.phase !== 'revealing'} onChange={(event) => engine.seekReveal(Number(event.target.value) / 100)} /></label>
        </aside>
      </div>
      <div className={styles.links}><Link to="/it">Echte Navigation: IT-Seite</Link><button type="button" className={styles.navigate} onClick={() => void navigate('/it')}>IT per useNavigate</button></div>
      <p>Die echte Navigation lässt sich anschließend auch mit Browser-Zurück und -Vorwärts prüfen. Escape oder Reset beendet eine Vorschau; reduzierte Bewegung verwendet einen kurzen neutralen Übergang.</p>
    </main>
  )
}
