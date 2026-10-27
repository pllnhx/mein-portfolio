// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BufferGeometry, Group, Line, Material, Scene, Texture } from 'three'

import { mountArtDock } from './artDockScene'

const rendererMock = vi.hoisted(() => ({
  construct: vi.fn(), render: vi.fn(), setClearColor: vi.fn(), setPixelRatio: vi.fn(),
  setSize: vi.fn(), dispose: vi.fn(), targetDispose: vi.fn(),
}))

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return {
    ...actual,
    WebGLRenderer: class {
      shadowMap = { enabled: false, type: 0 }
      setClearColor = rendererMock.setClearColor
      setPixelRatio = rendererMock.setPixelRatio
      setSize = rendererMock.setSize
      render = rendererMock.render
      dispose = rendererMock.dispose
      constructor() { rendererMock.construct() }
    },
    PMREMGenerator: class {
      fromScene() { return { texture: new actual.Texture(), dispose: rendererMock.targetDispose } }
      dispose() {}
    },
  }
})

vi.mock('./artToolModels', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return {
    // Keep real scene/material/geometry objects while replacing expensive art
    // construction. Include fibers and ridges to exercise non-Mesh disposal.
    createArtTool: () => {
      const group = new actual.Group()
      const mesh = new actual.Mesh(new actual.BoxGeometry(.2, 4, .2), new actual.MeshStandardMaterial({ map: new actual.Texture() }))
      mesh.position.y = 2
      group.add(mesh)
      group.add(new actual.LineSegments(new actual.BufferGeometry().setFromPoints([new actual.Vector3(0, 0, .1), new actual.Vector3(0, 4, .1)]), new actual.LineBasicMaterial()))
      group.add(new actual.Line(new actual.BufferGeometry().setFromPoints([new actual.Vector3(0, 1, .11), new actual.Vector3(0, 3, .11)]), new actual.LineBasicMaterial()))
      return group
    },
  }
})

let canvas: HTMLCanvasElement
let navigation: HTMLElement
let links: HTMLAnchorElement[]
let dispose: (() => void) | undefined
let reduced: boolean
let hidden: boolean
let mediaEvents: EventTarget
let scrollOffset: number
let observerDisconnect: ReturnType<typeof vi.fn>

function advance(milliseconds: number) { vi.advanceTimersByTime(milliseconds) }
function lastScene() { return rendererMock.render.mock.calls.at(-1)![0] as Scene }
function toolPivots() { return lastScene().children.filter((child) => child instanceof Group) }
function pointer(clientX: number) {
  const event = new Event('pointermove')
  Object.defineProperties(event, { clientX: { value: clientX }, pointerType: { value: 'mouse' } })
  navigation.dispatchEvent(event)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  reduced = false
  hidden = false
  scrollOffset = 0
  mediaEvents = new EventTarget()
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    get matches() { return query.includes('reduced-motion') ? reduced : false },
    addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
    removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
  })))
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
  observerDisconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = observerDisconnect })

  canvas = document.createElement('canvas')
  navigation = document.createElement('nav')
  links = ['graphite', 'charcoal', 'colored-pencil', 'flat-brush', 'palette-knife', 'fineliner', 'round-brush'].map((kind, index) => {
    const link = document.createElement('a')
    link.href = `/art/${kind}`
    link.dataset.artTool = kind
    vi.spyOn(link, 'getBoundingClientRect').mockImplementation(() => new DOMRect(24 + index * 106 - scrollOffset, 0, 94, 304))
    navigation.append(link)
    return link
  })
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 778, 304))
  document.body.append(canvas, navigation)
  dispose = undefined
})

afterEach(() => {
  dispose?.()
  document.body.replaceChildren()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('art dock rendering lifecycle', () => {
  it('uses one renderer for all seven tools and stops requesting frames at rest', () => {
    const ready = vi.fn()
    dispose = mountArtDock(canvas, navigation, ready)
    advance(16)

    expect(rendererMock.construct).toHaveBeenCalledOnce()
    expect(toolPivots()).toHaveLength(7)
    expect(ready).toHaveBeenCalledWith(true)
    expect(vi.getTimerCount()).toBe(0)
    const renders = rendererMock.render.mock.calls.length
    advance(1000)
    expect(rendererMock.render).toHaveBeenCalledTimes(renders)
  })

  it('magnifies the hovered tool and neighbors, then lets keyboard focus override a stationary pointer', () => {
    dispose = mountArtDock(canvas, navigation, vi.fn())
    advance(16)
    const pivots = toolPivots()
    const baseScales = pivots.map((pivot) => pivot.scale.x)

    pointer(71)
    advance(2000)
    expect(pivots[0].scale.x / baseScales[0]).toBeCloseTo(1.65, 2)
    expect(pivots[1].scale.x / baseScales[1]).toBeGreaterThan(1.2)
    expect(pivots[1].scale.x / baseScales[1]).toBeLessThan(1.3)

    links[3].focus()
    advance(2000)
    expect(pivots[3].scale.x / baseScales[3]).toBeCloseTo(1.65, 2)
    expect(pivots[0].scale.x / baseScales[0]).toBeCloseTo(1, 2)
  })

  it('snaps back without an animation loop when reduced motion becomes active', () => {
    dispose = mountArtDock(canvas, navigation, vi.fn())
    advance(16)
    const pivot = toolPivots()[0]
    const baseScale = pivot.scale.x
    pointer(71)
    advance(1000)
    expect(pivot.scale.x).toBeGreaterThan(baseScale)

    reduced = true
    mediaEvents.dispatchEvent(new Event('change'))
    advance(16)
    expect(pivot.scale.x).toBe(baseScale)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('updates tool positions during native scrolling without reallocating the renderer size', () => {
    dispose = mountArtDock(canvas, navigation, vi.fn())
    advance(16)
    const pivot = toolPivots()[0]
    const initialX = pivot.position.x
    const resizeCount = rendererMock.setSize.mock.calls.length
    const ratioCount = rendererMock.setPixelRatio.mock.calls.length
    scrollOffset = 40
    navigation.dispatchEvent(new Event('scroll'))
    advance(16)

    expect(pivot.position.x).toBe(initialX - 40)
    expect(rendererMock.setSize).toHaveBeenCalledTimes(resizeCount)
    expect(rendererMock.setPixelRatio).toHaveBeenCalledTimes(ratioCount)
  })

  it('pauses hidden documents and falls back on context loss until restoration', () => {
    const ready = vi.fn()
    dispose = mountArtDock(canvas, navigation, ready)
    advance(16)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    pointer(71)
    expect(vi.getTimerCount()).toBe(0)

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    advance(16)
    const lostEvent = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(lostEvent)
    expect(lostEvent.defaultPrevented).toBe(true)
    expect(ready).toHaveBeenLastCalledWith(false)
    pointer(71)
    expect(vi.getTimerCount()).toBe(0)

    canvas.dispatchEvent(new Event('webglcontextrestored'))
    expect(ready).toHaveBeenLastCalledWith(true)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('disposes mesh and line resources and prevents events from restarting a removed dock', () => {
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(Material.prototype, 'dispose')
    const textureDispose = vi.spyOn(Texture.prototype, 'dispose')
    dispose = mountArtDock(canvas, navigation, vi.fn())
    advance(16)
    const fibers: Line[] = []
    lastScene().traverse((object) => { if (object instanceof Line) fibers.push(object) })
    expect(fibers).toHaveLength(14)

    dispose()
    dispose = undefined
    for (const fiber of fibers) {
      expect(geometryDispose.mock.contexts).toContain(fiber.geometry)
      expect(materialDispose.mock.contexts).toContain(fiber.material)
    }
    expect(textureDispose).toHaveBeenCalledTimes(7)
    expect(rendererMock.dispose).toHaveBeenCalledOnce()
    expect(rendererMock.targetDispose).toHaveBeenCalledOnce()
    expect(observerDisconnect).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)

    pointer(71)
    window.dispatchEvent(new Event('resize'))
    navigation.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('visibilitychange'))
    mediaEvents.dispatchEvent(new Event('change'))
    expect(vi.getTimerCount()).toBe(0)
  })
})
