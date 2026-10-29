import { gsap } from 'gsap'
import type { TransitionContext, TransitionDirection, TransitionInstance, TransitionModule, TransitionSettings } from '../../types'
import { MatrixRain } from './MatrixRain'
import styles from './ITTransition.module.css'

export interface ITTransitionSettings extends TransitionSettings {
  density: number
  speed: number
  glitchStrength: number
  revealDuration: number
  showSuccess: boolean
}
export const IT_DEFAULTS: ITTransitionSettings = { density: .85, speed: 1, glitchStrength: .45, revealDuration: 1.15, showSuccess: true }
const clamp = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

function createITTransition(context: TransitionContext, direction: TransitionDirection): TransitionInstance {
  const duration = clamp(context.duration, 2.4, .3, 12)
  const revealDuration = clamp(context.settings.revealDuration, 1.15, duration * .2, duration * .75)
  const coverDuration = duration - revealDuration
  const density = clamp(context.settings.density, .85, .2, 1.8)
  const speed = clamp(context.settings.speed, 1, .2, 3)
  const glitchStrength = clamp(context.settings.glitchStrength, .45, 0, 1)
  const root = document.createElement('div')
  root.className = styles.root
  root.dataset.mode = direction
  root.style.setProperty('--it-glitch-strength', String(glitchStrength))
  const canvas = document.createElement('canvas')
  canvas.className = styles.canvas
  const message = document.createElement('p')
  message.className = styles.message
  message.textContent = direction === 'enter' ? 'CONNECTING_' : 'DISCONNECTING_'
  // Cover-only interference must disappear before the new page is revealed.
  // Keeping these pseudo-elements on root left them visible after canvas faded.
  const interference = document.createElement('div')
  interference.className = styles.interference
  interference.dataset.mode = direction
  interference.setAttribute('data-it-transition-interference', '')
  interference.setAttribute('aria-hidden', 'true')
  root.append(canvas, message, interference)
  context.mount.append(root)
  const rain = new MatrixRain(canvas, context.mount, density, speed)
  const scope = gsap.context(() => {}, root)
  const timelines = new Set<gsap.core.Timeline>()
  const pending = new Set<(reason: unknown) => void>()
  const previousStrength = context.source.style.getPropertyValue('--it-glitch-strength')
  let cleaned = false
  let completed = false
  let revealTimeline: gsap.core.Timeline | null = null
  let settle: (status: 'completed' | 'cancelled') => void = () => {}
  const finished = new Promise<'completed' | 'cancelled'>((resolve) => { settle = resolve })
  const removeGlitch = () => {
    interference.remove()
    rain.glitch = 0
    context.source.classList.remove(styles.sourceGlitch)
    if (previousStrength) context.source.style.setProperty('--it-glitch-strength', previousStrength)
    else context.source.style.removeProperty('--it-glitch-strength')
  }
  const run = (phase: 'covering' | 'revealing', build: (timeline: gsap.core.Timeline) => void) => new Promise<void>((resolve, reject) => {
    if (context.signal.aborted || cleaned) { reject(new DOMException('Cancelled', 'AbortError')); return }
    scope.add(() => {
      const timeline = gsap.timeline({ paused: true,
        onUpdate: () => context.onProgress(phase, timeline.progress()),
        onComplete: () => { pending.delete(reject); timelines.delete(timeline); resolve() },
      })
      pending.add(reject)
      timelines.add(timeline)
      if (phase === 'revealing') revealTimeline = timeline
      build(timeline)
      timeline.play()
    })
  })
  const cancel = () => {
    rain.dispose()
    for (const timeline of timelines) timeline.kill()
    timelines.clear()
    for (const reject of pending) reject(new DOMException('Cancelled', 'AbortError'))
    pending.clear()
    removeGlitch()
    settle('cancelled')
  }
  context.signal.addEventListener('abort', cancel, { once: true })

  return {
    finished,
    cover: async () => {
      if (direction === 'leave' && glitchStrength > 0) {
        context.source.style.setProperty('--it-glitch-strength', String(glitchStrength))
        context.source.classList.add(styles.sourceGlitch)
      }
      await run('covering', (timeline) => {
        timeline.to(context.backdrop, { opacity: direction === 'enter' ? .38 : .18, duration: coverDuration * .27, ease: 'power1.inOut' }, 0)
        timeline.fromTo(message, { opacity: 0 }, { opacity: 1, duration: coverDuration * .22 }, 0)
        timeline.to(canvas, { opacity: .92, duration: coverDuration * .64, ease: 'power2.inOut' }, coverDuration * .18)
        if (direction === 'leave') {
          timeline.to(rain, { glitch: glitchStrength, duration: coverDuration * .25 }, coverDuration * .22)
          timeline.to(rain, { glitch: 0, duration: coverDuration * .3 }, coverDuration * .55)
        }
        timeline.to(context.backdrop, { opacity: 1, duration: coverDuration * .5, ease: 'power2.inOut' }, coverDuration * .5)
      })
      removeGlitch()
      if (context.settings.showSuccess !== false) message.textContent = direction === 'enter' ? 'ACCESS GRANTED' : 'SYSTEM ONLINE'
    },
    reveal: async () => {
      removeGlitch()
      await run('revealing', (timeline) => {
        timeline.to(context.backdrop, { opacity: 0, duration: revealDuration * .88, ease: 'power2.inOut' }, 0)
        timeline.to(message, { opacity: 0, duration: revealDuration * .5, ease: 'power1.inOut' }, revealDuration * .15)
        timeline.to(canvas, { opacity: 0, duration: revealDuration, ease: 'power2.out' }, 0)
      })
      completed = true
      settle('completed')
    },
    cancel,
    seekReveal: (progress) => { revealTimeline?.progress(progress, false).play() },
    cleanup: () => {
      if (cleaned) return
      cleaned = true
      if (!completed) cancel()
      context.signal.removeEventListener('abort', cancel)
      scope.revert()
      rain.dispose()
      removeGlitch()
      root.remove()
    },
  }
}

export const ITTransition: TransitionModule = {
  id: 'it', duration: 2.4, settings: IT_DEFAULTS,
  enter: (context) => createITTransition(context, 'enter'),
  leave: (context) => createITTransition(context, 'leave'),
}
export default ITTransition
