import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { createDepthPortrait } from './createDepthPortrait.ts'
import { normalizedPointer, smoothPointer } from './portraitMath.ts'
import { PORTRAIT_ASSETS } from './portraitAssets.ts'

const originals = new Map()
const install = (name, value) => {
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

function fixture({ compile = true } = {}) {
  const frames = new Map()
  let nextFrame = 0
  let draws = 0
  const deleted = { textures: 0, shaders: 0, programs: 0, buffers: 0 }
  const uniforms = new Map()
  const target = () => ({
    listeners: new Map(),
    addEventListener(name, callback) { this.listeners.set(name, callback) },
    removeEventListener(name) { this.listeners.delete(name) },
    dispatchEvent(event) { this.listeners.get(event.type)?.(event); return !event.defaultPrevented },
  })
  install('window', { ...target(), devicePixelRatio: 3 })
  install('document', { ...target(), hidden: false })
  install('requestAnimationFrame', (callback) => { frames.set(++nextFrame, callback); return nextFrame })
  install('cancelAnimationFrame', (id) => frames.delete(id))
  install('Image', class {
    naturalWidth = 1048
    naturalHeight = 931
    set src(url) { if (url) queueMicrotask(() => this.onload?.()) }
  })
  let disconnected = 0
  install('IntersectionObserver', class { observe() {} disconnect() { disconnected++ } })
  install('ResizeObserver', class { observe() {} disconnect() { disconnected++ } })
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, UNPACK_FLIP_Y_WEBGL: 8,
    TEXTURE0: 10, TEXTURE_2D: 11, TEXTURE_MIN_FILTER: 12, TEXTURE_MAG_FILTER: 13,
    LINEAR: 14, TEXTURE_WRAP_S: 15, TEXTURE_WRAP_T: 16, CLAMP_TO_EDGE: 17,
    RGBA: 18, UNSIGNED_BYTE: 19, BLEND: 20, COLOR_BUFFER_BIT: 21, TRIANGLE_STRIP: 22,
    createShader: () => ({}), shaderSource() {}, compileShader() {}, getShaderParameter: () => compile,
    getShaderInfoLog: () => 'test shader failure',
    createProgram: () => ({}), attachShader() {}, linkProgram() {}, getProgramParameter: () => true,
    useProgram() {}, createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
    getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {}, pixelStorei() {},
    createTexture: () => ({}), activeTexture() {}, bindTexture() {}, texParameteri() {}, texImage2D() {},
    getUniformLocation: (_, name) => name,
    uniform1i: (name, value) => uniforms.set(name, value),
    uniform1f: (name, value) => uniforms.set(name, value),
    uniform2f: (name, x, y) => uniforms.set(name, [x, y]),
    disable() {}, clearColor() {}, viewport() {}, clear() {}, drawArrays() { draws++ },
    deleteTexture() { deleted.textures++ }, deleteShader() { deleted.shaders++ },
    deleteProgram() { deleted.programs++ }, deleteBuffer() { deleted.buffers++ },
  }
  const canvas = { ...target(), width: 0, height: 0, getContext: () => gl, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1048, height: 931 }) }
  return {
    canvas, gl, frames, uniforms, deleted,
    paint(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(time)) },
    get draws() { return draws },
    get disconnected() { return disconnected },
    get cleaned() { return frames.size + canvas.listeners.size + window.listeners.size + document.listeners.size === 0 },
  }
}

test('mouse normalization and smoothing stay bounded and independent of frame rate', () => {
  const bounds = { left: 10, top: 20, width: 400, height: 800 }
  assert.deepEqual(normalizedPointer(210, 420, bounds), { x: 0, y: 0 })
  assert.deepEqual(normalizedPointer(-100, -100, bounds), { x: -1, y: 1 })
  assert.deepEqual(normalizedPointer(1000, 1000, bounds), { x: 1, y: -1 })
  assert.ok(Math.abs(smoothPointer(smoothPointer(0, 1, 16), 1, 16) - smoothPointer(0, 1, 32)) < 1e-12)
})

test('all four supplied maps are bound; DPR is capped and idle rendering stops', async () => {
  const env = fixture()
  const scene = await createDepthPortrait(env.canvas, PORTRAIT_ASSETS, new AbortController().signal)
  assert.equal(env.canvas.width, 1834)
  assert.equal(env.canvas.height, 1629)
  assert.deepEqual(['uPhoto', 'uDepth', 'uRoughness', 'uAlpha'].map((name) => env.uniforms.get(name)), [0, 1, 2, 3])
  env.paint(16)
  assert.equal(env.draws, 1)
  assert.equal(env.frames.size, 0)
  window.listeners.get('pointermove')({ clientX: 1048, clientY: 0, pointerType: 'mouse' })
  env.paint(32)
  const pointer = env.uniforms.get('uPointer')
  assert.ok(pointer[0] > 0 && pointer[0] < 1 && pointer[1] > 0 && pointer[1] < 1)
  scene.setActive(false)
  assert.equal(env.frames.size, 0)
  window.listeners.get('pointermove')({ clientX: 0, clientY: 931, pointerType: 'mouse' })
  assert.equal(env.frames.size, 0)
  scene.setActive(true)
  assert.equal(env.frames.size, 1)
  scene.dispose()
  scene.dispose()
  assert.deepEqual(env.deleted, { textures: 4, shaders: 2, programs: 1, buffers: 1 })
  assert.equal(env.disconnected, 2)
  assert.ok(env.cleaned)
})

test('abort during asset loading and shader failure free partially created resources', async () => {
  let env = fixture()
  const controller = new AbortController()
  const pending = createDepthPortrait(env.canvas, PORTRAIT_ASSETS, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.ok(env.cleaned)
  // Reuse the environment but reject shader compilation after textures decode.
  env.gl.getShaderParameter = () => false
  await assert.rejects(createDepthPortrait(env.canvas, PORTRAIT_ASSETS, new AbortController().signal), /test shader failure/)
  assert.equal(env.deleted.shaders, 1)
  assert.equal(env.deleted.programs, 1)
  assert.ok(env.cleaned)
})

test('WebGL context loss stops rendering and requests the static cutout fallback', async () => {
  const env = fixture()
  const scene = await createDepthPortrait(env.canvas, PORTRAIT_ASSETS, new AbortController().signal)
  let fallback = false
  env.canvas.listeners.set('portrait-fallback', () => { fallback = true })
  const event = new Event('webglcontextlost', { cancelable: true })
  env.canvas.dispatchEvent(event)
  assert.equal(event.defaultPrevented, true)
  assert.equal(fallback, true)
  assert.equal(env.frames.size, 0)
  assert.equal(env.deleted.textures, 4)
  scene.dispose()
})
