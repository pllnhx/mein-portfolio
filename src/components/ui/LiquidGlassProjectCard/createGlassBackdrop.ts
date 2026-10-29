import { glassFragmentShader, glassVertexShader } from './glassShaders.ts'
import { GLASS_MAX_CARDS, GLASS_RADIUS, glassBackgroundOffset, glassCardRect, glassResolution, visibleGlassArea } from './glassGeometry.ts'

/** One viewport-sized context; the CSS parallax remains active without WebGL. */
export function createGlassBackdrop(canvas: HTMLCanvasElement, section: HTMLElement) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' })
  const capable = !!gl && typeof gl.createShader === 'function'
  const shaders: WebGLShader[] = []
  const uniforms = new Map<string, WebGLUniformLocation | null>()
  const originalPosition = section.style.backgroundPosition
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let frame: number | null = null
  let disposed = false
  let gpuReady = false
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null }
  const releaseGpu = () => {
    gpuReady = false
    delete section.dataset.glassRenderer
    canvas.style.height = '0px'
    if (!capable || !gl) return
    gl.useProgram(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    if (buffer) { gl.deleteBuffer(buffer); buffer = null }
    if (program) { gl.deleteProgram(program); program = null }
    shaders.splice(0).forEach(shader => gl.deleteShader(shader))
    uniforms.clear()
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    stop()
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    window.removeEventListener('scroll', invalidate)
    window.removeEventListener('resize', invalidate)
    section.removeEventListener('project-layout', invalidate)
    document.removeEventListener('visibilitychange', visibility)
    media.removeEventListener('change', invalidate)
    canvas.removeEventListener('webglcontextlost', lost)
    section.style.backgroundPosition = originalPosition
    releaseGpu()
  }
  const uniform = (name: string) => uniforms.get(name) ?? null
  const draw = () => {
    frame = null
    if (disposed || document.hidden) return
    const bounds = section.getBoundingClientRect()
    const backgroundOffset = glassBackgroundOffset(bounds.top, media.matches)
    // CSS samples p - backgroundPosition; GLSL samples p + offset.
    const cssPosition = `0px ${-backgroundOffset}px`
    section.style.backgroundPosition = [cssPosition, cssPosition, cssPosition, cssPosition].join(', ')
    if (!gpuReady || !gl) return
    const area = visibleGlassArea(bounds, window.innerHeight)
    if (area.height <= 0 || area.width <= 0) { canvas.style.height = '0px'; return }
    canvas.style.top = `${area.top}px`
    canvas.style.height = `${area.height}px`
    const resolution = glassResolution(area.width, area.height, window.devicePixelRatio)
    if (canvas.width !== resolution.width) canvas.width = resolution.width
    if (canvas.height !== resolution.height) canvas.height = resolution.height
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-liquid-glass-card]'))
      .map(card => glassCardRect(card.getBoundingClientRect(), bounds))
      .filter(card => card[1] + card[3] >= area.top && card[1] <= area.top + area.height)
    if (cards.length > GLASS_MAX_CARDS) {
      delete section.dataset.glassRenderer
      canvas.style.height = '0px'
      return
    }
    const packed = new Float32Array(GLASS_MAX_CARDS * 4)
    cards.forEach((card, index) => packed.set(card, index * 4))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uniform('uResolution'), canvas.width, canvas.height)
    gl.uniform2f(uniform('uViewSize'), area.width, area.height)
    gl.uniform1f(uniform('uWorldTop'), area.top)
    gl.uniform2f(uniform('uSectionSize'), bounds.width, bounds.height)
    gl.uniform1f(uniform('uBackgroundOffset'), backgroundOffset)
    gl.uniform4fv(uniform('uCards[0]'), packed)
    gl.uniform1i(uniform('uCardCount'), cards.length)
    gl.uniform1f(uniform('uRadius'), window.innerWidth <= 650 ? 32 : GLASS_RADIUS)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    section.dataset.glassRenderer = 'webgl'
  }
  const invalidate = () => { if (!disposed && !document.hidden && frame === null) frame = requestAnimationFrame(draw) }
  const visibility = () => { if (document.hidden) stop(); else invalidate() }
  // Keep the same scroll controller alive after context loss for CSS parallax.
  const lost = (event: Event) => { event.preventDefault(); releaseGpu(); invalidate() }
  if (capable && gl) {
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Glass shader unavailable')
        shaders.push(shader)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Glass shader failed')
        return shader
      }
      program = gl.createProgram()
      if (!program) throw new Error('Glass program unavailable')
      gl.attachShader(program, compile(gl.VERTEX_SHADER, glassVertexShader))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, glassFragmentShader))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Glass program failed')
      gl.useProgram(program)
      for (const name of ['uResolution', 'uViewSize', 'uWorldTop', 'uSectionSize', 'uBackgroundOffset', 'uCards[0]', 'uCardCount', 'uRadius']) {
        uniforms.set(name, gl.getUniformLocation(program, name))
      }
      buffer = gl.createBuffer()
      if (!buffer) throw new Error('Glass geometry unavailable')
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const attribute = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(attribute)
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
      gpuReady = true
    } catch { releaseGpu() }
  }
  resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null
  resizeObserver?.observe(section)
  mutationObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(invalidate) : null
  mutationObserver?.observe(section, { childList: true, subtree: true })
  window.addEventListener('scroll', invalidate, { passive: true })
  window.addEventListener('resize', invalidate)
  section.addEventListener('project-layout', invalidate)
  document.addEventListener('visibilitychange', visibility)
  media.addEventListener('change', invalidate)
  canvas.addEventListener('webglcontextlost', lost)
  draw()
  return dispose
}
