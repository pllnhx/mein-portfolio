// @vitest-environment jsdom
import { act, createElement, useRef } from 'react'
import type { CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useMedizinMotion from './useMedizinMotion'

let root: Root | null
let container: HTMLDivElement
let page: HTMLDivElement
let target: HTMLDivElement
let reduced: boolean
let fine: boolean
let hidden: boolean
let anchorBox: DOMRect
let now: number
let nextFrame: number
let frames: Map<number, FrameRequestCallback>
let reducedEvents: EventTarget
let fineEvents: EventTarget
let observers: Array<{
  callback: IntersectionObserverCallback
  observe: ReturnType<typeof vi.fn>
  unobserve: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}>

function Harness() {
  const ref = useRef<HTMLDivElement>(null)
  useMedizinMotion(ref)
  return createElement('div', { ref, id: 'motion-page' },
    createElement('div', { 'data-anchor': '' },
      createElement('div', {
        'data-parallax': '40',
        'data-pointer': '20',
        'data-reveal': '',
        style: { '--pointer-x': '4px' } as CSSProperties,
      }),
    ),
  )
}

function mount() {
  act(() => root!.render(createElement(Harness)))
  page = container.querySelector('#motion-page')!
  target = page.querySelector('[data-parallax]')!
}

function advanceFrame() {
  now += 16
  const callbacks = [...frames.values()]
  frames.clear()
  act(() => callbacks.forEach(callback => callback(now)))
}

function settle() {
  let remaining = 100
  while (frames.size && remaining-- > 0) advanceFrame()
  expect(frames.size).toBe(0)
}

function pointer(type: string, x: number, y: number) {
  const event = new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })
  Object.defineProperty(event, 'pointerType', { value: type })
  act(() => page.dispatchEvent(event))
}

function changeReduced(value: boolean) {
  reduced = value
  act(() => reducedEvents.dispatchEvent(new Event('change')))
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('innerWidth', 1000)
  vi.stubGlobal('innerHeight', 800)
  reduced = false
  fine = true
  hidden = false
  now = 0
  nextFrame = 0
  frames = new Map()
  observers = []
  anchorBox = new DOMRect(0, 800, 500, 400)
  reducedEvents = new EventTarget()
  fineEvents = new EventTarget()
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2400)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const isReduced = query.includes('reduced-motion')
    const events = isReduced ? reducedEvents : fineEvents
    return {
      get matches() { return isReduced ? reduced : fine },
      media: query,
      addEventListener: vi.fn(events.addEventListener.bind(events)),
      removeEventListener: vi.fn(events.removeEventListener.bind(events)),
    }
  }))
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor(callback: IntersectionObserverCallback) { observers.push({ callback, ...this }) }
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-anchor') ? anchorBox : new DOMRect()
  })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useMedizinMotion', () => {
  it('keeps content visible and does not start frame or input work under reduced motion', () => {
    reduced = true
    mount()
    expect(page.dataset.motion).toBe('reduced')
    expect(target.dataset.revealed).toBe('true')
    expect(observers).toHaveLength(0)
    pointer('mouse', 900, 700)
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(0)
    expect(target.style.getPropertyValue('--pointer-x')).toBe('0px')
  })

  it('bounds scroll transforms, reads stable parent bounds, and sleeps once settled', () => {
    mount()
    settle()
    expect(target.style.getPropertyValue('--scroll-y')).toBe('-40.000px')
    anchorBox = new DOMRect(0, -1200, 500, 400)
    vi.stubGlobal('scrollY', 800)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(1)
    settle()
    expect(target.style.getPropertyValue('--scroll-y')).toBe('40.000px')
    expect(page.style.getPropertyValue('--scroll-progress')).toBe('0.5000')
  })

  it('ignores touch, clamps mouse response, and returns to rest on pointer leave', () => {
    mount()
    settle()
    pointer('touch', 1000, 800)
    expect(frames.size).toBe(0)
    pointer('mouse', 2000, -1000)
    settle()
    expect(target.style.getPropertyValue('--pointer-x')).toBe('20.000px')
    expect(target.style.getPropertyValue('--pointer-y')).toBe('-20.000px')
    page.dispatchEvent(new Event('pointerleave'))
    settle()
    expect(target.style.getPropertyValue('--pointer-x')).toBe('0.000px')
  })

  it('keeps scrolling active on coarse-only devices without tracking their pointers', () => {
    fine = false
    mount()
    settle()
    expect(page.dataset.motion).toBe('active')
    expect(target.style.getPropertyValue('--scroll-y')).toBe('-40.000px')
    pointer('mouse', 1000, 800)
    expect(frames.size).toBe(0)
    fine = true
    fineEvents.dispatchEvent(new Event('change'))
    settle()
    pointer('mouse', 1000, 800)
    settle()
    expect(target.style.getPropertyValue('--pointer-x')).toBe('20.000px')
  })

  it('cancels running frames and removes active listeners on preference and visibility changes', () => {
    mount()
    expect(frames.size).toBe(1)
    changeReduced(true)
    expect(frames.size).toBe(0)
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    expect(target.style.getPropertyValue('--scroll-y')).toBe('0px')
    window.dispatchEvent(new Event('scroll'))
    expect(frames.size).toBe(0)
    changeReduced(false)
    expect(frames.size).toBe(1)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(page.dataset.motion).toBe('paused')
    expect(frames.size).toBe(0)
    pointer('mouse', 1000, 800)
    expect(frames.size).toBe(0)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    expect(page.dataset.motion).toBe('active')
    settle()
  })

  it('reveals observed elements once and restores all DOM state on cleanup', () => {
    mount()
    const observer = observers[0]
    expect(observer.observe).toHaveBeenCalledWith(target)
    observer.callback([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(target.dataset.revealed).toBe('true')
    expect(observer.unobserve).toHaveBeenCalledWith(target)
    pointer('mouse', 1000, 800)
    act(() => root!.unmount())
    root = null
    expect(frames.size).toBe(0)
    expect(page.hasAttribute('data-motion')).toBe(false)
    expect(page.style.getPropertyValue('--scroll-progress')).toBe('')
    expect(target.hasAttribute('data-revealed')).toBe(false)
    expect(target.style.getPropertyValue('--scroll-y')).toBe('')
    expect(target.style.getPropertyValue('--pointer-x')).toBe('4px')
    expect(observer.disconnect).toHaveBeenCalledOnce()
    window.dispatchEvent(new Event('scroll'))
    pointer('mouse', 1000, 800)
    reducedEvents.dispatchEvent(new Event('change'))
    expect(frames.size).toBe(0)
  })

  it('shows every reveal target immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    mount()
    expect(target.dataset.revealed).toBe('true')
    settle()
  })
})
