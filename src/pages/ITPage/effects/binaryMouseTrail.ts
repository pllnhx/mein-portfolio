const CELL_WIDTH = 12
const CELL_HEIGHT = 18
const RADIUS_X = 34
const RADIUS_Y = 42
const MAX_CELLS = 700

type Point = { x: number; y: number }
type BinaryCell = Point & { digit: '0' | '1'; born: number; lifetime: number; opacity: number }

/** Render only while a bounded, document-anchored mouse trail is fading. */
export function startBinaryMouseTrail(canvas: HTMLCanvasElement, scope: HTMLElement) {
  const context = canvas.getContext('2d')
  if (!context) return () => {}

  const cells = new Map<string, BinaryCell>()
  let width = 0
  let height = 0
  let previous: Point | null = null
  let frame: number | null = null

  const clear = () => {
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = null
    previous = null
    cells.clear()
    context.clearRect(0, 0, width, height)
  }

  const resize = () => {
    clear()
    width = window.innerWidth
    height = window.innerHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.font = '11px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#ffffff'
  }

  const paint = (now: number) => {
    frame = null
    context.clearRect(0, 0, width, height)
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    cells.forEach((cell, key) => {
      const age = (now - cell.born) / cell.lifetime
      if (age >= 1) { cells.delete(key); return }
      const x = cell.x - scrollX
      const y = cell.y - scrollY
      if (x < -CELL_WIDTH || x > width + CELL_WIDTH || y < -CELL_HEIGHT || y > height + CELL_HEIGHT) return
      context.globalAlpha = cell.opacity * Math.pow(Math.max(0, 1 - age), 1.5)
      context.fillText(cell.digit, x, y)
    })
    context.globalAlpha = 1
    if (cells.size) frame = window.requestAnimationFrame(paint)
  }

  const stamp = (point: Point, now: number) => {
    const minColumn = Math.floor((point.x - RADIUS_X) / CELL_WIDTH)
    const maxColumn = Math.ceil((point.x + RADIUS_X) / CELL_WIDTH)
    const minRow = Math.floor((point.y - RADIUS_Y) / CELL_HEIGHT)
    const maxRow = Math.ceil((point.y + RADIUS_Y) / CELL_HEIGHT)
    for (let column = minColumn; column <= maxColumn; column++) {
      for (let row = minRow; row <= maxRow; row++) {
        const x = (column + .5) * CELL_WIDTH
        const y = (row + .5) * CELL_HEIGHT
        const distance = Math.hypot((x - point.x) / RADIUS_X, (y - point.y) / RADIUS_Y)
        if (distance > 1 || Math.random() > .2 + (1 - distance) * .6) continue
        const key = `${column}:${row}`
        const existing = cells.get(key)
        cells.delete(key)
        cells.set(key, {
          x, y,
          digit: existing?.digit ?? (Math.random() < .5 ? '0' : '1'),
          born: now,
          lifetime: 1100 + Math.random() * 1000,
          opacity: Math.max(existing?.opacity ?? 0, .18 + (1 - distance) * .42),
        })
        if (cells.size > MAX_CELLS) cells.delete(cells.keys().next().value!)
      }
    }
  }

  const move = (event: PointerEvent) => {
    if (document.hidden || event.pointerType === 'touch') return
    const point = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY }
    const now = performance.now()
    if (previous) {
      const steps = Math.min(16, Math.max(1, Math.ceil(Math.hypot(point.x - previous.x, point.y - previous.y) / 10)))
      for (let step = 1; step <= steps; step++) {
        const progress = step / steps
        stamp({ x: previous.x + (point.x - previous.x) * progress, y: previous.y + (point.y - previous.y) * progress }, now)
      }
    } else stamp(point, now)
    previous = point
    if (frame === null && cells.size) frame = window.requestAnimationFrame(paint)
  }

  const resetPosition = () => { previous = null }
  resize()
  scope.addEventListener('pointermove', move, { passive: true })
  scope.addEventListener('pointerleave', resetPosition)
  window.addEventListener('scroll', resetPosition, { passive: true })
  window.addEventListener('resize', resize)
  window.addEventListener('blur', clear)
  document.addEventListener('visibilitychange', clear)

  return () => {
    clear()
    scope.removeEventListener('pointermove', move)
    scope.removeEventListener('pointerleave', resetPosition)
    window.removeEventListener('scroll', resetPosition)
    window.removeEventListener('resize', resize)
    window.removeEventListener('blur', clear)
    document.removeEventListener('visibilitychange', clear)
  }
}
