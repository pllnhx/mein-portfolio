import { randomBetween, SCREEN_INTERVAL } from './effectTiming.ts'

export type ScreenEvent = { opacity: number; duration: number }

export function startScreenEffects(onChange: (event: ScreenEvent | null) => void) {
  let timer: ReturnType<typeof window.setTimeout>
  const schedule = (elapsed = 0) => {
    timer = window.setTimeout(() => {
      if (document.hidden) { schedule(); return }
      const duration = randomBetween(1200, 1700)
      onChange({ opacity: randomBetween(.4, .6), duration })
      timer = window.setTimeout(() => {
        onChange(null)
        schedule(duration)
      }, duration)
    }, randomBetween(...SCREEN_INTERVAL) - elapsed)
  }
  const reset = () => {
    window.clearTimeout(timer)
    onChange(null)
    schedule()
  }
  schedule()
  document.addEventListener('visibilitychange', reset)
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', reset)
    onChange(null)
  }
}
