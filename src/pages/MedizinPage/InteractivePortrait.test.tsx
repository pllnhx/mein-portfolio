// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InteractivePortrait from './InteractivePortrait'

let root: Root
let container: HTMLDivElement
let button: HTMLButtonElement
let wrap: HTMLDivElement
let plane: HTMLDivElement

function pointer(type: string, pointerType = 'mouse', position = { clientX: 150, clientY: 350 }) {
  const event = new MouseEvent(type, { bubbles: true, ...position })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  act(() => button.dispatchEvent(event))
}

function focus(keyboard = true) {
  const originalMatches = button.matches
  vi.spyOn(button, 'matches').mockImplementation((selector) =>
    selector === ':focus-visible' ? keyboard : originalMatches.call(button, selector),
  )
  act(() => button.focus())
}

function press(key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  act(() => button.dispatchEvent(event))
  return event
}

function click() { act(() => button.click()) }

function expectState(active: boolean, pinned: boolean) {
  expect(wrap.dataset.vascularActive).toBe(String(active))
  expect(wrap.dataset.pinned).toBe(String(pinned))
  expect(button.getAttribute('aria-pressed')).toBe(String(pinned))
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  container.dataset.motion = 'active'
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(<InteractivePortrait />))
  button = container.querySelector('button')!
  wrap = container.querySelector('[data-vascular-active]')!
  plane = container.querySelector('img')!.parentElement as HTMLDivElement
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 300))
  vi.spyOn(plane, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 200, 200, 300))
})

afterEach(() => {
  act(() => root.unmount())
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InteractivePortrait', () => {
  it.each(['mouse', 'pen'])('previews for %s entry without announcing a pinned state', (pointerType) => {
    expectState(false, false)
    pointer('pointerover', pointerType)
    expectState(true, false)
    pointer('pointerout', pointerType)
    expectState(false, false)
  })

  it('uses tapping to pin and unpin while touch entry and exit do not toggle the view', () => {
    pointer('pointerover', 'touch')
    expectState(false, false)
    click()
    expectState(true, true)
    pointer('pointerout', 'touch')
    expectState(true, true)
    click()
    expectState(false, false)
  })

  it('keeps a pinned mouse view open after the pointer leaves, then closes on the next click', () => {
    pointer('pointerover')
    click()
    pointer('pointerout')
    expectState(true, true)
    click()
    expectState(false, false)
  })

  it.each(['hover', 'focus', 'pinned'])('Escape closes a %s view', (source) => {
    if (source === 'hover') pointer('pointerover')
    if (source === 'focus') focus()
    if (source === 'pinned') { pointer('pointerover'); click() }
    expect(wrap.dataset.vascularActive).toBe('true')

    expect(press('Escape').defaultPrevented).toBe(true)
    expectState(false, false)
  })

  it('previews on keyboard focus, clears on blur, and uses a native button for keyboard activation', () => {
    expect(button.type).toBe('button')
    focus()
    expectState(true, false)
    act(() => button.blur())
    expectState(false, false)
    act(() => button.focus())
    expectState(true, false)

    // jsdom does not synthesize Enter's native button click; dispatch that click explicitly.
    expect(press('Enter').defaultPrevented).toBe(false)
    click()
    expectState(true, true)
    act(() => button.blur())
    expectState(true, true)
  })

  it('does not mistake focus from a pointer for a keyboard preview', () => {
    focus(false)
    expectState(false, false)
  })

  it('normalizes the scan position and clamps movement to the image edges', () => {
    pointer('pointermove')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('25%')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('50%')

    pointer('pointermove', 'pen', { clientX: 500, clientY: 0 })
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('100%')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('0%')

    pointer('pointermove', 'mouse', { clientX: 0, clientY: 900 })
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('0%')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('100%')

    pointer('pointerout')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('')
  })

  it('does not move the scan for touch, reduced motion, or a missing motion controller', () => {
    pointer('pointermove', 'touch')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('')

    container.dataset.motion = 'reduced'
    pointer('pointermove')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('')

    delete container.dataset.motion
    pointer('pointermove')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('')

    // The information is still available without pointer-following motion.
    click()
    expectState(true, true)
  })

  it('registers the scan to the transformed portrait plane rather than the stationary button', () => {
    // Pointer/parallax motion shifts the visible image while the hit target stays in place.
    vi.mocked(plane.getBoundingClientRect).mockReturnValue(new DOMRect(140, 170, 200, 300))
    pointer('pointermove', 'mouse', { clientX: 190, clientY: 320 })
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('25%')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('50%')

    // Re-read the visual bounds after a further translate/scale instead of caching button bounds.
    vi.mocked(plane.getBoundingClientRect).mockReturnValue(new DOMRect(240, 210, 300, 450))
    pointer('pointermove', 'mouse', { clientX: 390, clientY: 435 })
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('50%')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('50%')
    expect(button.getBoundingClientRect).not.toHaveBeenCalled()
  })

  it('ignores scan movement before the image has a measurable size', () => {
    vi.mocked(plane.getBoundingClientRect).mockReturnValue(new DOMRect())
    pointer('pointermove')
    expect(wrap.style.getPropertyValue('--scan-x')).toBe('')
    expect(wrap.style.getPropertyValue('--scan-y')).toBe('')
  })
})
