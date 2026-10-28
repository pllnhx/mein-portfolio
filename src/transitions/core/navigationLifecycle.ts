import type { NavigationAction, RouteLocation } from '../types'
import { afterPaint, guarded } from './async'

export type ScrollPosition = { x: number; y: number }
export function restoreScroll(location: RouteLocation, action: NavigationAction, positions: Map<string, ScrollPosition>) {
  const saved = action === 'POP' ? positions.get(location.key ?? location.pathname) : undefined
  if (saved) { window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' }); return }
  if (location.hash) {
    try {
      const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)))
      if (anchor) { anchor.scrollIntoView({ behavior: 'instant' }); return }
    } catch { /* Malformed hashes are treated like a normal page navigation. */ }
  }
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
}
export async function pageReady(content: HTMLElement, pending: Set<Promise<unknown>>, signal: AbortSignal) {
  await afterPaint(signal)
  await guarded(Promise.all([...pending]), signal, 5000)
  const images = Array.from(content.querySelectorAll('img')).filter((image) => {
    const bounds = image.getBoundingClientRect()
    return bounds.top < window.innerHeight && bounds.bottom > 0 && typeof image.decode === 'function'
  })
  const resources = Promise.all([
    document.fonts?.ready,
    ...images.map((image) => image.decode().catch(() => {})),
  ])
  // Image dimensions/aspect ratios already reserve layout; late images don't lock navigation.
  await guarded(resources, signal, 500).catch((error: unknown) => { if (signal.aborted) throw error })
  await afterPaint(signal)
}
export function focusPage(content: HTMLElement) {
  const element = content.querySelector<HTMLElement>('[data-page-focus]')
    ?? content.querySelector<HTMLElement>('h1')
    ?? content.querySelector<HTMLElement>('main') ?? content
  const old = element.getAttribute('tabindex')
  element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
  const restore = () => {
    if (old === null) element.removeAttribute('tabindex')
    else element.setAttribute('tabindex', old)
  }
  element.addEventListener('blur', restore, { once: true })
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove())
  return copy.textContent?.replace(/\s+/g, ' ').trim() ?? 'Seite'
}
