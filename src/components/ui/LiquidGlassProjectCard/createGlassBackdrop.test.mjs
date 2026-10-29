import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createGlassBackdrop } from './createGlassBackdrop.ts'

const originals = new Map()
function install(name, value) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
}
afterEach(() => {
  originals.forEach((descriptor, name) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  })
  originals.clear()
})

function fixture({ compile = true, cardCount = 2 } = {}) {
  const eventTarget = () => ({ listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, callback) }, removeEventListener(name) { this.listeners.delete(name) } })
  const frames = new Map(), uniforms = new Map()
  let counter = 0, draws = 0, disconnected = 0
  const deleted = { shaders: 0, buffers: 0, programs: 0 }
  const media = { ...eventTarget(), matches: false }
  install('window', { ...eventTarget(), innerHeight: 800, innerWidth: 1200, devicePixelRatio: 3, matchMedia: () => media })
  install('document', { ...eventTarget(), hidden: false })
  install('requestAnimationFrame', callback => { frames.set(++counter, callback); return counter })
  install('cancelAnimationFrame', id => frames.delete(id))
  install('ResizeObserver', class { observe() {} disconnect() { disconnected++ } })
  install('MutationObserver', class { observe() {} disconnect() { disconnected++ } })
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TRIANGLES: 8,
    createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => compile, getShaderInfoLog: () => 'test compile error',
    createProgram: () => ({}), attachShader() {}, linkProgram() {}, getProgramParameter: () => true, useProgram() {},
    createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {},
    getUniformLocation: (_program, name) => name, uniform2f: (name, x, y) => uniforms.set(name, [x, y]), uniform1f: (name, value) => uniforms.set(name, value), uniform1i: (name, value) => uniforms.set(name, value), uniform4fv: (name, value) => uniforms.set(name, value),
    viewport() {}, drawArrays() { draws++ }, deleteShader() { deleted.shaders++ }, deleteProgram() { deleted.programs++ }, deleteBuffer() { deleted.buffers++ },
  }
  const bounds = { left: 0, top: -200, width: 1200, height: 4000 }
  const section = { ...eventTarget(), style: { backgroundPosition: 'initial' }, dataset: {}, getBoundingClientRect: () => bounds, querySelectorAll: () => Array.from({ length: cardCount }, (_, index) => ({ getBoundingClientRect: () => ({ left: 100 + index * 10, top: 100, width: 350, height: 340 }) })) }
  const canvas = { ...eventTarget(), style: {}, width: 0, height: 0, getContext: () => gl }
  return { section, canvas, gl, media, deleted, uniforms, frames, bounds, get draws() { return draws }, get disconnected() { return disconnected }, paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()) } }
}

test('one viewport context paints before enabling glass; scroll coalesces and idle stops', () => {
  const env = fixture()
  const dispose = createGlassBackdrop(env.canvas, env.section)
  assert.equal(env.draws, 1)
  assert.equal(env.section.dataset.glassRenderer, 'webgl')
  assert.equal(env.canvas.style.top, '200px')
  assert.equal(env.canvas.style.height, '800px')
  assert.ok(env.canvas.width * env.canvas.height <= 2_005_000)
  assert.equal(env.uniforms.get('uWorldTop'), 200)
  assert.equal(env.uniforms.get('uBackgroundOffset'), -120)
  assert.equal(env.section.style.backgroundPosition, Array(4).fill('0px 120px').join(', '))
  assert.deepEqual(Array.from(env.uniforms.get('uCards[0]')).slice(0, 4), [100, 300, 350, 340])
  assert.equal(env.frames.size, 0)
  window.listeners.get('scroll')()
  window.listeners.get('scroll')()
  assert.equal(env.frames.size, 1)
  env.paint()
  assert.equal(env.draws, 2)
  assert.equal(env.frames.size, 0)
  window.listeners.get('scroll')()
  dispose()
  dispose()
  assert.equal(env.frames.size, 0)
  assert.equal(env.section.dataset.glassRenderer, undefined)
  assert.equal(env.section.style.backgroundPosition, 'initial')
  assert.deepEqual(env.deleted, { shaders: 2, programs: 1, buffers: 1 })
  assert.equal(env.disconnected, 2)
  assert.equal(window.listeners.size + document.listeners.size + env.section.listeners.size + env.canvas.listeners.size, 0)
})

test('unsupported contexts, compile errors and context loss keep CSS fallback usable', () => {
  const env = fixture({ compile: false })
  createGlassBackdrop(env.canvas, env.section)()
  assert.equal(env.section.dataset.glassRenderer, undefined)
  assert.deepEqual(env.deleted, { shaders: 1, programs: 1, buffers: 0 })
  assert.doesNotThrow(() => createGlassBackdrop({ ...env.canvas, getContext: () => null }, env.section)())
  assert.doesNotThrow(() => createGlassBackdrop({ ...env.canvas, getContext: () => ({}) }, env.section)())
})

test('context loss switches back atomically and a larger future grid never loses its fallback', () => {
  const env = fixture()
  const cleanup = createGlassBackdrop(env.canvas, env.section)
  let prevented = false
  env.canvas.listeners.get('webglcontextlost')({ preventDefault() { prevented = true } })
  assert.ok(prevented)
  assert.equal(env.section.dataset.glassRenderer, undefined)
  assert.equal(env.canvas.style.height, '0px')
  env.bounds.top = -400
  window.listeners.get('scroll')()
  env.paint()
  assert.equal(env.section.style.backgroundPosition, Array(4).fill('0px 240px').join(', '), 'fallback parallax survives context loss')
  cleanup()
  const large = fixture({ cardCount: 17 })
  const dispose = createGlassBackdrop(large.canvas, large.section)
  assert.equal(large.section.dataset.glassRenderer, undefined)
  assert.equal(large.canvas.style.height, '0px')
  dispose()
})

test('CSS-only backgrounds still scroll independently; reduced motion returns to fixed sampling', () => {
  const env = fixture()
  env.canvas.getContext = () => null
  const dispose = createGlassBackdrop(env.canvas, env.section)
  assert.equal(env.section.style.backgroundPosition, Array(4).fill('0px 120px').join(', '))
  assert.equal(env.draws, 0)
  env.media.matches = true
  env.media.listeners.get('change')()
  env.paint()
  assert.equal(env.section.style.backgroundPosition, Array(4).fill('0px 0px').join(', '))
  window.listeners.get('scroll')()
  document.hidden = true
  document.listeners.get('visibilitychange')()
  assert.equal(env.frames.size, 0)
  dispose()
})
