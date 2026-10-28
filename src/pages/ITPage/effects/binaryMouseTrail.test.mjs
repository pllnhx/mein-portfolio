import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { startBinaryMouseTrail } from './binaryMouseTrail.ts'

const originals = new Map()

function install(name, value) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
}

afterEach(() => {
  mock.restoreAll()
  originals.forEach((descriptor, name) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  })
  originals.clear()
})

function environment() {
  let now = 0
  let nextFrame = 0
  const frames = new Map()
  const drawn = []
  const target = () => ({
    listeners: new Map(),
    addEventListener(name, callback) { this.listeners.set(name, callback) },
    removeEventListener(name) { this.listeners.delete(name) },
  })
  const scope = target()
  install('window', {
    ...target(), innerWidth: 1200, innerHeight: 900, devicePixelRatio: 2,
    scrollX: 0, scrollY: 0,
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame: (id) => frames.delete(id),
  })
  install('document', { ...target(), hidden: false })
  mock.method(performance, 'now', () => now)
  mock.method(Math, 'random', () => .25)
  const context = {
    globalAlpha: 1,
    setTransform() {},
    clearRect() { drawn.length = 0 },
    fillText(digit, x, y) { drawn.push({ digit, x, y, opacity: this.globalAlpha, color: this.fillStyle }) },
  }
  const canvas = { getContext: () => context }
  return {
    scope, canvas, frames, drawn,
    move(pointerType = 'mouse', x = 150, y = 153) {
      scope.listeners.get('pointermove')?.({ pointerType, clientX: x, clientY: y })
    },
    paint(time) {
      now = time
      const callbacks = Array.from(frames.values())
      frames.clear()
      callbacks.forEach((callback) => callback(time))
    },
    get cleaned() { return frames.size + scope.listeners.size + window.listeners.size + document.listeners.size === 0 },
  }
}

test('mouse movement leaves white binary digits that fade and stop rendering', () => {
  const env = environment()
  const stop = startBinaryMouseTrail(env.canvas, env.scope)
  assert.equal(env.frames.size, 0, 'an idle page does not run an animation loop')
  env.move()
  assert.equal(env.frames.size, 1)
  env.paint(100)
  assert.ok(env.drawn.length > 0)
  assert.ok(env.drawn.every((cell) => /^[01]$/.test(cell.digit) && cell.color === '#ffffff'))
  const opacity = env.drawn[0].opacity
  env.paint(600)
  assert.ok(env.drawn[0].opacity < opacity)
  env.paint(2300)
  assert.equal(env.drawn.length, 0)
  assert.equal(env.frames.size, 0)
  stop()
  assert.ok(env.cleaned)
})

test('the trail stays attached to the page while scrolling; touch gestures do not draw', () => {
  const env = environment()
  const stop = startBinaryMouseTrail(env.canvas, env.scope)
  env.move('touch')
  assert.equal(env.frames.size, 0)
  env.move()
  env.paint(100)
  const first = { ...env.drawn[0] }
  window.scrollY = 50
  window.listeners.get('scroll')()
  env.paint(200)
  assert.equal(env.drawn[0].x, first.x)
  assert.equal(env.drawn[0].y, first.y - 50)
  stop()
  assert.ok(env.cleaned)
})

test('hiding or leaving the page cancels frames and clears the trail and listeners', () => {
  const env = environment()
  const stop = startBinaryMouseTrail(env.canvas, env.scope)
  env.move()
  env.paint(100)
  document.hidden = true
  document.listeners.get('visibilitychange')()
  assert.equal(env.frames.size, 0)
  assert.equal(env.drawn.length, 0)
  env.move()
  assert.equal(env.frames.size, 0)
  document.hidden = false
  env.move()
  assert.equal(env.frames.size, 1)
  stop()
  assert.ok(env.cleaned)
})
