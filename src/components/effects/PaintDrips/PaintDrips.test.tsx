// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PaintDrips from './PaintDrips'
import styles from './PaintDrips.module.css'

// React selects vendor animation event names during module initialization.
// jsdom omits this constructor although it supports the standard event name.
vi.hoisted(() => {
  if (!window.AnimationEvent) Object.defineProperty(window, 'AnimationEvent', { configurable: true, value: Event })
})

let root: Root | null
let container: HTMLDivElement
let image: HTMLImageElement
let hidden: boolean
let reduced: boolean
let media: MediaQueryList
let mediaEvents: EventTarget
let resizeObserver: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds))
}

function mount() {
  const anchorRef = { current: image }
  act(() => root!.render(<PaintDrips anchorRef={anchorRef} />))
}

function bead() { return container.querySelector<HTMLElement>(`.${styles.bead}`) }
function drop() { return container.querySelector<HTMLElement>(`.${styles.drop}`) }

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  hidden = false
  reduced = false
  mediaEvents = new EventTarget()
  media = {
    get matches() { return reduced },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(mediaEvents.addEventListener.bind(mediaEvents)),
    removeEventListener: vi.fn(mediaEvents.removeEventListener.bind(mediaEvents)),
    dispatchEvent: mediaEvents.dispatchEvent.bind(mediaEvents),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  } as MediaQueryList
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    disconnect = vi.fn()
    constructor() { resizeObserver = this }
  })

  const pixels = new Uint8ClampedArray(128 * 128 * 4)
  // A sparse speck below the paint must not move the anchor off the T's stem.
  pixels[(124 * 128 + 40) * 4 + 3] = 255
  for (let x = 60; x <= 67; x++) pixels[(112 * 128 + x) * 4 + 3] = 255
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: pixels })),
  } as unknown as CanvasRenderingContext2D)

  image = document.createElement('img')
  Object.defineProperties(image, { naturalWidth: { value: 1000 }, naturalHeight: { value: 1000 } })
  vi.spyOn(image, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 200))
  document.body.append(image)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.replaceChildren()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PaintDrips', () => {
  it('anchors the bead at the opaque paint edge rather than the transparent image boundary', () => {
    mount()
    advance(16)

    expect(parseFloat(bead()!.style.left)).toBeCloseTo(199.21875)
    expect(parseFloat(bead()!.style.top)).toBeCloseTo(374)
    expect(drop()).toBeNull()
  })

  it('creates a drop every five seconds and keeps only one falling drop', () => {
    mount()
    advance(4999)
    expect(drop()).toBeNull()

    advance(1)
    const firstDrop = drop()
    expect(firstDrop).not.toBeNull()
    expect(firstDrop!.style.getPropertyValue('--drop-distance')).toBe(`${Math.max(180, window.innerHeight - 374 + 30)}px`)

    advance(5000)
    expect(drop()).not.toBe(firstDrop)
    expect(container.querySelectorAll(`.${styles.drop}`)).toHaveLength(1)
  })

  it('removes a finished falling drop and permits the next scheduled drop', () => {
    mount()
    advance(5000)
    act(() => drop()!.dispatchEvent(new Event('animationend', { bubbles: true })))
    expect(drop()).toBeNull()

    advance(5000)
    expect(drop()).not.toBeNull()
  })

  it('does not create an animation frame or interval when reduced motion is enabled', () => {
    reduced = true
    const interval = vi.spyOn(window, 'setInterval')
    mount()
    advance(15000)

    expect(bead()).toBeNull()
    expect(drop()).toBeNull()
    expect(interval).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops an active animation when reduced motion changes and starts a fresh cycle on resume', () => {
    mount()
    advance(5000)
    expect(drop()).not.toBeNull()

    reduced = true
    act(() => mediaEvents.dispatchEvent(new Event('change')))
    expect(bead()).toBeNull()
    expect(drop()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    reduced = false
    act(() => mediaEvents.dispatchEvent(new Event('change')))
    advance(4999)
    expect(drop()).toBeNull()
    advance(1)
    expect(drop()).not.toBeNull()
  })

  it('pauses while the document is hidden and waits a full cycle after becoming visible', () => {
    mount()
    advance(5000)
    hidden = true
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(bead()).toBeNull()
    expect(drop()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)

    advance(15000)
    hidden = false
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    advance(4999)
    expect(drop()).toBeNull()
    advance(1)
    expect(drop()).not.toBeNull()
  })

  it('cleans pending timers, the observer and every installed lifecycle listener on unmount', () => {
    const addWindow = vi.spyOn(window, 'addEventListener')
    const removeWindow = vi.spyOn(window, 'removeEventListener')
    const addDocument = vi.spyOn(document, 'addEventListener')
    const removeDocument = vi.spyOn(document, 'removeEventListener')
    const addImage = vi.spyOn(image, 'addEventListener')
    const removeImage = vi.spyOn(image, 'removeEventListener')
    mount()
    expect(vi.getTimerCount()).toBe(2)

    act(() => root!.unmount())
    root = null
    expect(vi.getTimerCount()).toBe(0)
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce()
    for (const type of ['resize', 'scroll']) {
      const callback = addWindow.mock.calls.find(([event]) => event === type)![1]
      expect(removeWindow).toHaveBeenCalledWith(type, callback)
    }
    expect(removeDocument).toHaveBeenCalledWith('visibilitychange', addDocument.mock.calls.find(([event]) => event === 'visibilitychange')![1])
    expect(removeImage).toHaveBeenCalledWith('load', addImage.mock.calls.find(([event]) => event === 'load')![1])
    expect(media.removeEventListener).toHaveBeenCalledWith('change', vi.mocked(media.addEventListener).mock.calls[0][1])

    act(() => {
      window.dispatchEvent(new Event('scroll'))
      document.dispatchEvent(new Event('visibilitychange'))
      mediaEvents.dispatchEvent(new Event('change'))
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([-500, 1200])('does not emit drops when the paint anchor is outside the viewport (top=%s)', (top) => {
    vi.mocked(image.getBoundingClientRect).mockReturnValue(new DOMRect(100, top, 200, 200))
    mount()
    advance(15000)
    expect(drop()).toBeNull()
  })
})
