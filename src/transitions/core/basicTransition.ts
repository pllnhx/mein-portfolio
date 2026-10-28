import type { TransitionContext, TransitionInstance } from '../types.ts'
import { delay } from './async.ts'

/** Neutral fallback and reduced-motion transition; no themed runtime is imported. */
export function basicTransition(context: TransitionContext, duration = .12): TransitionInstance {
  let settle: (result: 'completed' | 'cancelled') => void = () => {}
  const finished = new Promise<'completed' | 'cancelled'>((resolve) => { settle = resolve })
  const controller = new AbortController()
  const abort = () => controller.abort()
  context.signal.addEventListener('abort', abort, { once: true })
  const fade = async (opacity: number, phase: 'covering' | 'revealing') => {
    context.backdrop.style.transition = `opacity ${duration / 2}s linear`
    context.backdrop.style.opacity = String(opacity)
    await delay(duration * 500, controller.signal)
    context.onProgress(phase, 1)
  }
  return {
    finished,
    cover: () => fade(1, 'covering'),
    reveal: async () => { await fade(0, 'revealing'); settle('completed') },
    cancel: () => { controller.abort(); settle('cancelled') },
    cleanup: () => {
      controller.abort()
      settle('cancelled')
      context.signal.removeEventListener('abort', abort)
      context.backdrop.style.removeProperty('transition')
    },
  }
}
