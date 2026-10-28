import { portraitFragmentShader, portraitVertexShader } from './shaders.ts'
import { normalizedPointer, smoothPointer } from './portraitMath.ts'
import { PORTRAIT_SETTINGS } from './portraitAssets.ts'
import type { PortraitAssets } from './portraitAssets.ts'

export interface DepthPortraitHandle { dispose(): void; setActive(active: boolean): void }

function loadImage(url: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    const cleanup = () => { signal.removeEventListener('abort', abort); image.onload = null; image.onerror = null }
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Cancelled', 'AbortError')) }
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    image.onload = () => { cleanup(); resolve(image) }
    image.onerror = () => { cleanup(); reject(new Error(`Portrait texture could not be loaded: ${url}`)) }
    image.src = url
  })
}

/** One transparent WebGL plane with aligned photo, depth, roughness and cutout maps. */
export async function createDepthPortrait(canvas: HTMLCanvasElement, assets: PortraitAssets, signal: AbortSignal): Promise<DepthPortraitHandle | null> {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: 'low-power' })
  if (!gl || typeof gl.createShader !== 'function') return null
  const shaders: WebGLShader[] = []
  const textures: WebGLTexture[] = []
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let frame: number | null = null
  let observer: IntersectionObserver | null = null
  let resizeObserver: ResizeObserver | null = null
  let visible = true
  let enabled = true
  let disposed = false
  let previous = 0
  const pointer = { x: 0, y: 0 }
  const target = { x: 0, y: 0 }
  const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null }
  const dispose = () => {
    if (disposed) return
    disposed = true
    stop()
    observer?.disconnect()
    resizeObserver?.disconnect()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerout', leave)
    window.removeEventListener('blur', leave)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', visibility)
    canvas.removeEventListener('webglcontextlost', lost)
    signal.removeEventListener('abort', dispose)
    gl.useProgram(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    textures.forEach((texture) => gl.deleteTexture(texture))
    shaders.forEach((shader) => gl.deleteShader(shader))
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
  }
  let pointerUniform: WebGLUniformLocation | null = null
  const draw = (time: number) => {
    frame = null
    if (disposed || !visible || !enabled || document.hidden) return
    const elapsed = previous ? Math.max(1, time - previous) : 16
    previous = time
    pointer.x = smoothPointer(pointer.x, target.x, elapsed)
    pointer.y = smoothPointer(pointer.y, target.y, elapsed)
    gl.uniform2f(pointerUniform, pointer.x, pointer.y)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (Math.abs(pointer.x - target.x) + Math.abs(pointer.y - target.y) > .0005) frame = requestAnimationFrame(draw)
  }
  const requestDraw = () => { if (!disposed && visible && enabled && !document.hidden && frame === null) frame = requestAnimationFrame(draw) }
  const resize = () => {
    if (disposed) return
    const bounds = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, PORTRAIT_SETTINGS.maxDpr)
    canvas.width = Math.max(1, Math.round(bounds.width * dpr))
    canvas.height = Math.max(1, Math.round(bounds.height * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
    requestDraw()
  }
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !visible || !enabled || document.hidden) return
    Object.assign(target, normalizedPointer(event.clientX, event.clientY, canvas.getBoundingClientRect()))
    requestDraw()
  }
  const leave = (event: Event) => {
    if ('relatedTarget' in event && event.relatedTarget) return
    target.x = 0; target.y = 0
    requestDraw()
  }
  const visibility = () => { previous = 0; if (document.hidden) stop(); else requestDraw() }
  const lost = (event: Event) => {
    event.preventDefault()
    dispose()
    canvas.dispatchEvent(new CustomEvent('portrait-fallback'))
  }

  try {
    const images = await Promise.all([assets.photo, assets.depth, assets.roughness, assets.alpha].map((url) => loadImage(url, signal)))
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    const aspect = images[0].naturalWidth / images[0].naturalHeight
    if (images.some((image) => Math.abs(image.naturalWidth / image.naturalHeight - aspect) > .005)) throw new Error('Portrait maps must have the same aspect ratio')
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('WebGL shader unavailable')
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Portrait shader failed')
      return shader
    }
    program = gl.createProgram()
    if (!program) throw new Error('WebGL program unavailable')
    gl.attachShader(program, compile(gl.VERTEX_SHADER, portraitVertexShader))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, portraitFragmentShader))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Portrait program failed')
    gl.useProgram(program)
    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const names = ['uPhoto', 'uDepth', 'uRoughness', 'uAlpha']
    images.forEach((image, index) => {
      const texture = gl.createTexture()
      if (!texture) throw new Error('Portrait texture unavailable')
      textures.push(texture)
      gl.activeTexture(gl.TEXTURE0 + index)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.uniform1i(gl.getUniformLocation(program!, names[index]), index)
    })
    pointerUniform = gl.getUniformLocation(program, 'uPointer')
    gl.uniform2f(gl.getUniformLocation(program, 'uTexel'), 2 / images[1].naturalWidth, 2 / images[1].naturalHeight)
    gl.uniform1f(gl.getUniformLocation(program, 'uParallax'), PORTRAIT_SETTINGS.parallax)
    gl.uniform1f(gl.getUniformLocation(program, 'uReflection'), PORTRAIT_SETTINGS.reflection)
    gl.disable(gl.BLEND)
    gl.clearColor(0, 0, 0, 0)
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; previous = 0; if (visible) requestDraw(); else stop() })
      observer.observe(canvas)
    }
    if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas) }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerout', leave)
    window.addEventListener('blur', leave)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', visibility)
    canvas.addEventListener('webglcontextlost', lost)
    signal.addEventListener('abort', dispose, { once: true })
    resize()
    return { dispose, setActive: (active) => { enabled = active; previous = 0; if (active) requestDraw(); else stop() } }
  } catch (error) {
    dispose()
    throw error
  }
}
