import { useBlocker, useLocation, useNavigationType } from 'react-router'
import type { BlockerFunction } from 'react-router'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { TransitionEngine } from './core/TransitionEngine'
import { TransitionControlsContext } from './core/TransitionControls'
import { abortError, afterPaint } from './core/async'
import { focusPage, pageReady, restoreScroll } from './core/navigationLifecycle'
import type { ScrollPosition } from './core/navigationLifecycle'
import type { NavigationAction, RouteLocation } from './types'
import styles from './PageTransitionManager.module.css'

export function PageTransitionManager({ engine, children }: { engine: TransitionEngine; children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const source = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const current = useRef<RouteLocation>(location)
  const action = useRef<NavigationAction>('PUSH')
  const scroll = useRef(new Map<string, ScrollPosition>())
  const readiness = useRef(new Set<Promise<unknown>>())
  const commit = useRef<{ fromKey: string; resolve: () => void } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation, historyAction }) => {
    action.current = historyAction
    if (!engine.busy) scroll.current.set(currentLocation.key, { x: window.scrollX, y: window.scrollY })
    return engine.busy || currentLocation.pathname !== nextLocation.pathname
  }, [engine])
  const blocker = useBlocker(shouldBlock)
  const latestBlocker = useRef(blocker)
  const busy = snapshot.phase !== 'idle'
  const deferReveal = useCallback((promise: Promise<unknown>) => {
    readiness.current.add(promise)
    // Attach a handler now; pageReady will surface failures at the readiness barrier.
    void promise.catch(() => {})
    return () => { readiness.current.delete(promise) }
  }, [])
  const controls = useMemo(() => ({ snapshot, cancel: engine.cancel, deferReveal }), [snapshot, engine, deferReveal])

  useLayoutEffect(() => {
    const previous = current.current
    current.current = location
    latestBlocker.current = blocker
    if (commit.current && location.key !== commit.current.fromKey) {
      commit.current.resolve()
      commit.current = null
    }
    if (!engine.busy && previous.pathname === location.pathname && previous.key !== location.key) {
      restoreScroll(location, navigationType, scroll.current)
    }
  }, [location, blocker, engine, navigationType])

  useLayoutEffect(() => {
    if (!busy) return
    const overflow = document.body.style.overflow
    const padding = document.body.style.paddingRight
    const gutter = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    if (gutter) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || '0') + gutter}px`
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; document.body.style.paddingRight = padding }
  }, [busy])

  useEffect(() => {
    const restoration = window.history.scrollRestoration
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChange = () => { if (media.matches) engine.cancel() }
    media.addEventListener('change', motionChange)
    window.history.scrollRestoration = 'manual'
    const capture = (event: MouseEvent) => {
      if (!engine.busy || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest('a')
      if (anchor && (!anchor.target || anchor.target === '_self') && !anchor.hasAttribute('download') && new URL(anchor.href, window.location.origin).origin === window.location.origin) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!engine.busy) return
      if (event.key === 'Escape') engine.cancel()
      if (['Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) event.preventDefault()
    }
    document.addEventListener('click', capture, true)
    document.addEventListener('keydown', keyboard, true)
    return () => {
      document.removeEventListener('click', capture, true)
      document.removeEventListener('keydown', keyboard, true)
      window.history.scrollRestoration = restoration
      media.removeEventListener('change', motionChange)
      engine.dispose()
    }
  }, [engine])

  useEffect(() => {
    if (blocker.state !== 'blocked' || engine.busy || !source.current || !host.current || !backdrop.current || !mount.current) return
    const blocked = blocker
    const from = current.current
    const navigationAction = action.current
    const originFocus = document.activeElement as HTMLElement | null
    const content = source.current
    scroll.current.set(from.key ?? from.pathname, { x: window.scrollX, y: window.scrollY })
    const task = async () => {
      setAnnouncement('Seitenwechsel wird vorbereitet.')
      const result = await engine.run({
        from, to: blocked.location, action: navigationAction,
        source: content, host: host.current!, backdrop: backdrop.current!, mount: mount.current!,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        commit: (signal) => new Promise<void>((resolve, reject) => {
          if (signal.aborted) { reject(abortError()); return }
          const abort = () => { commit.current = null; reject(abortError()) }
          signal.addEventListener('abort', abort, { once: true })
          readiness.current.clear()
          commit.current = { fromKey: from.key ?? 'default', resolve: () => { signal.removeEventListener('abort', abort); resolve() } }
          blocked.proceed()
        }),
        ready: async (signal) => {
          restoreScroll(current.current, navigationAction, scroll.current)
          await pageReady(content, readiness.current, signal)
        },
      })
      if (latestBlocker.current.state === 'blocked') latestBlocker.current.reset()
      const completedKey = current.current.key
      await afterPaint(new AbortController().signal)
      if (!content.isConnected || engine.busy || current.current.key !== completedKey) return
      if (result.committed) setAnnouncement(`Seite geladen: ${focusPage(content)}`)
      else { if (originFocus?.isConnected) originFocus.focus({ preventScroll: true }); setAnnouncement('Seitenwechsel abgebrochen.') }
    }
    void task()
  }, [blocker, engine])

  return (
    <TransitionControlsContext.Provider value={controls}>
      <div ref={source} className={styles.content} inert={busy} aria-busy={busy} data-transition-content>{children}</div>
      <div ref={host} className={styles.overlay} aria-hidden="true" data-transition-overlay>
        <div ref={backdrop} className={styles.backdrop} data-transition-backdrop />
        <div ref={mount} className={styles.mount} />
      </div>
      <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </TransitionControlsContext.Provider>
  )
}
