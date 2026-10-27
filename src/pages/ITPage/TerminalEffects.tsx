import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import styles from './ITPage.module.css'

const motionQuery = '(prefers-reduced-motion: reduce)'
const subscribeToMotion = (callback: () => void) => {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches
const getServerMotion = () => true

function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion)
}

export function GlitchTitle() {
  const reducedMotion = useReducedMotion()
  const [glitching, setGlitching] = useState(false)

  useEffect(() => {
    if (reducedMotion) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = (elapsed = 0) => {
      timer = setTimeout(() => {
        if (document.hidden) {
          schedule()
          return
        }
        setGlitching(true)
        timer = setTimeout(() => {
          setGlitching(false)
          schedule(180)
        }, 180)
      }, 1000 + Math.random() * 3000 - elapsed)
    }
    schedule()
    return () => {
      clearTimeout(timer)
      setGlitching(false)
    }
  }, [reducedMotion])

  const text = <><span className={styles.titlePrompt}>&gt;_</span>{' '}IT &amp; Vibe{' '}<span className={styles.lastWord}>Coding<span className={styles.cursor} aria-hidden="true" /></span></>

  return (
    <h1 id="it-title" className={`${styles.title} ${glitching && !reducedMotion ? styles.glitching : ''}`}>
      <span>{text}</span>
      <span className={styles.glitchLayer} aria-hidden="true">{text}</span>
      <span className={styles.glitchLayer} aria-hidden="true">{text}</span>
    </h1>
  )
}

const codeLines = [
  'const idea = await discover();',
  'import { curiosity } from "life";',
  'const canvas = createCanvas();',
  'function buildSomething() {',
  '  return ideas.map(explore);',
  '}',
  'const pixels = new Float32Array(64);',
  'scene.add(new PerspectiveCamera());',
  'requestAnimationFrame(render);',
  'const [ready, setReady] = useState(false);',
  'if (curious) keepLearning();',
  '// a little better, every day',
  'const light = { x: 0, y: 1 };',
  'await experiment.compile();',
  'export default CreativeMind;',
  'const progress = step + 1;',
  'git commit -m "make it happen"',
  'npm run dev',
  'console.log("hello, possibility");',
  '// the next idea starts here_',
]

type CodeBlock = {
  id: number
  x: number
  y: number
  lines: string[]
  duration: number
}

export function CodeBackground() {
  const reducedMotion = useReducedMotion()

  return (
    <div className={styles.codeBackground} aria-hidden="true">
      {!reducedMotion && <AnimatedCode />}
    </div>
  )
}

function AnimatedCode() {
  const [blocks, setBlocks] = useState<CodeBlock[]>([])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let nextId = 0
    const removals = new Set<ReturnType<typeof setTimeout>>()
    const spawn = () => {
      if (!document.hidden) {
        const count = 3 + Math.floor(Math.random() * 18)
        const start = Math.floor(Math.random() * codeLines.length)
        const lines = Array.from({ length: count }, (_, index) => codeLines[(start + index) % codeLines.length])
        const duration = lines.reduce((sum, line) => sum + line.length * 20 + 100, 0) + 3500
        const block = { id: nextId++, x: Math.random() * 72, y: 4 + Math.random() * 64, lines, duration }
        setBlocks((current) => [...current.slice(-2), block])
        const removal = setTimeout(() => {
          setBlocks((current) => current.filter((item) => item.id !== block.id))
          removals.delete(removal)
        }, duration)
        removals.add(removal)
      }
      timer = setTimeout(spawn, 4500 + Math.random() * 2500)
    }
    timer = setTimeout(spawn, 800)
    return () => {
      clearTimeout(timer)
      removals.forEach(clearTimeout)
    }
  }, [])

  return (
    <>
      {blocks.map((block) => {
        let delay = 0
        return (
          <div key={block.id} className={styles.backgroundBlock} style={{ left: `${block.x}%`, top: `${block.y}%`, '--lifetime': `${block.duration}ms` } as CSSProperties}>
            {block.lines.map((line, index) => {
              const duration = line.length * 20
              const style = { '--characters': line.length, '--typing-duration': `${duration}ms`, '--typing-delay': `${delay}ms` } as CSSProperties
              delay += duration + 100
              return <span key={index} className={styles.backgroundLine} style={style}>{line}</span>
            })}
          </div>
        )
      })}
    </>
  )
}
