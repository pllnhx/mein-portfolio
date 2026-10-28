import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { TerminalText } from '../../components/effects/TerminalText/TerminalText'
import { chooseTone, TITLE_GLITCH_DURATION, randomBetween, TITLE_INTERVAL } from './effects/effectTiming'
import { startWordEffects } from './effects/wordEffects'
import { startScreenEffects } from './effects/screenEffects'
import { startBinaryMouseTrail } from './effects/binaryMouseTrail'
import type { ScreenEvent } from './effects/screenEffects'
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

export function BinaryMouseTrail() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = canvas.current
    if (reducedMotion || !element?.parentElement) return
    return startBinaryMouseTrail(element, element.parentElement)
  }, [reducedMotion])

  return <canvas ref={canvas} className={styles.binaryTrail} aria-hidden="true" />
}

export function GlitchTitle() {
  const reducedMotion = useReducedMotion()
  const [glitching, setGlitching] = useState<'mono' | 'color' | null>(null)

  useEffect(() => {
    if (reducedMotion) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = (elapsed = 0) => {
      timer = setTimeout(() => {
        if (document.hidden) {
          schedule()
          return
        }
        setGlitching(chooseTone())
        timer = setTimeout(() => {
          setGlitching(null)
          schedule(TITLE_GLITCH_DURATION)
        }, TITLE_GLITCH_DURATION)
      }, randomBetween(...TITLE_INTERVAL) - elapsed)
    }
    schedule()
    return () => {
      clearTimeout(timer)
      setGlitching(null)
    }
  }, [reducedMotion])

  const text = <><span className={styles.titlePrompt}>&gt;_</span>{' '}IT &amp; Vibe{' '}<span className={styles.lastWord}>Coding<span className={styles.cursor} aria-hidden="true" /></span></>

  return (
    <h1 id="it-title" data-title-effects className={`${styles.title} ${glitching && !reducedMotion ? styles.glitching : ''} ${glitching === 'color' ? styles.colorGlitch : ''}`}>
      <span><TerminalText>{text}</TerminalText></span>
      <span className={styles.glitchLayer} aria-hidden="true">{text}</span>
      <span className={styles.glitchLayer} aria-hidden="true">{text}</span>
    </h1>
  )
}

export function PageEffects({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [screenEvent, setScreenEvent] = useState<ScreenEvent | null>(null)

  useEffect(() => {
    if (reducedMotion || !root.current) return
    const stopWords = startWordEffects(root.current)
    const stopScreen = startScreenEffects(setScreenEvent)
    return () => {
      stopWords()
      stopScreen()
    }
  }, [reducedMotion])

  const activeEvent = reducedMotion ? null : screenEvent
  return (
    <>
      <div ref={root} className={`${className} ${activeEvent ? styles.screenDistortion : ''}`} style={activeEvent ? { '--screen-duration': `${activeEvent.duration}ms` } as CSSProperties : undefined}>
        <TerminalText>{children}</TerminalText>
      </div>
      {activeEvent && <ScreenInterference event={activeEvent} />}
    </>
  )
}

function ScreenInterference({ event }: { event: ScreenEvent }) {
  const id = useId()
  const skullMask = `${id}-skull`
  const codePattern = `${id}-code`
  return (
    <div className={styles.screenOverlay} aria-hidden="true" style={{ '--screen-opacity': event.opacity, '--screen-duration': `${event.duration}ms` } as CSSProperties}>
      <div className={styles.interferenceCode}>
        {Array.from({ length: 16 }, (_, index) => <div key={index}>{`0x${(index * 7919).toString(16).padStart(6, '0')} :: ${codeLines[index % codeLines.length]} // SYSTEM_TRACE [${index.toString(2).padStart(8, '0')}]`}</div>)}
      </div>
      <div className={styles.skullFrame}>
        <span className={styles.overlayLabel}>SIGNAL INTERRUPTED // 0xDEAD</span>
        <svg className={styles.codeSkull} viewBox="0 0 480 520" focusable="false">
          <defs>
            <pattern id={codePattern} width="480" height="100" patternUnits="userSpaceOnUse">
              <rect width="480" height="100" fill="#16443f" />
              {[0, 1, 2, 3, 4, 5, 6].map((line) => <text key={line} x={line % 2 ? -17 : 0} y={12 + line * 14} fill={line % 3 ? '#7ff6e9' : '#d0fff8'} fontFamily="monospace" fontSize="11" letterSpacing="1">{line % 2 ? '0xDEAD 01001101 void system.trace(); /root/null' : '01101001 return (signal !== null); 0xFF [ACCESS]'}</text>)}
            </pattern>
            <mask id={skullMask}>
              <path fill="white" d="M240 30C131 30 77 102 78 192c0 47 15 72 27 94l-5 58 47 25 20 88c25 30 121 30 146 0l20-88 47-25-5-58c12-22 27-47 27-94C403 102 349 30 240 30Z" />
              <path fill="black" d="M117 223c12-20 61-33 88-11l-8 64c-34 24-83 4-80-53Zm246 0c-12-20-61-33-88-11l8 64c34 24 83 4 80-53ZM240 273l-29 69 29-8 29 8-29-69Z" />
              <path d="m168 373 144 0m-136 43 128 0M193 368l5 81m22-81 2 89m20-89-1 90m23-90-3 87m25-87-7 79" stroke="black" strokeWidth="8" />
            </mask>
          </defs>
          <g mask={`url(#${skullMask})`}>
            <rect width="480" height="520" fill={`url(#${codePattern})`} />
            <path d="M92 149h296M80 188h319M107 299h268M137 352h205" stroke="#c5fff6" strokeWidth="3" opacity=".7" />
            <path d="M122 96c70-62 166-62 236 0M124 120c66-56 166-56 232 0" stroke="#a7fff1" fill="none" opacity=".5" />
          </g>
        </svg>
        <span className={styles.overlayMessage}>SYSTEM OVERRIDE<span>CONNECTION LOST_</span></span>
      </div>
      <div className={styles.pixelArtifacts}><i /><i /><i /><i /><i /><i /></div>
    </div>
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
