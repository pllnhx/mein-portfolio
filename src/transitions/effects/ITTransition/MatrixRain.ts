const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]#$%+=' 
type Stream = { x: number; y: number; speed: number; length: number; glyphs: string[]; row: number }
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

export class MatrixRain {
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private context: CanvasRenderingContext2D | null
  private columns: Stream[] = []
  private width = 1
  private height = 1
  private cell = 18
  private frame = 0
  private previous = 0
  private observer: ResizeObserver | null = null
  private density: number
  private speed: number
  glitch = 0

  constructor(canvas: HTMLCanvasElement, container: HTMLElement, density: number, speed: number) {
    this.canvas = canvas
    this.container = container
    this.context = canvas.getContext('2d')
    this.density = density
    this.speed = speed
    this.resize()
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.resize)
      this.observer.observe(container)
    }
    window.addEventListener('resize', this.resize)
    if (this.context) this.frame = requestAnimationFrame(this.paint)
  }
  private resize = () => {
    this.width = Math.max(1, this.container.clientWidth || window.innerWidth)
    this.height = Math.max(1, this.container.clientHeight || window.innerHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.width * dpr)
    this.canvas.height = Math.round(this.height * dpr)
    const font = this.width < 600 ? 14 : 16
    this.cell = font * 1.2
    const count = Math.min(180, Math.max(4, Math.ceil(this.width / (this.cell / this.density))))
    this.columns = Array.from({ length: count }, (_, index) => {
      const length = Math.floor(10 + Math.random() * (this.width < 600 ? 13 : 23))
      return { x: index * this.width / count, y: Math.random() * this.height * 1.4 - this.height * .2,
        speed: (95 + Math.random() * 170) * this.speed, length,
        glyphs: Array.from({ length }, glyph), row: 0 }
    })
    this.context?.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.context) { this.context.font = `${font}px Consolas, Menlo, monospace`; this.context.textBaseline = 'top' }
  }
  private paint = (now: number) => {
    const context = this.context
    if (!context) return
    const dt = Math.min(.05, Math.max(0, (now - (this.previous || now)) / 1000))
    this.previous = now
    if (!document.hidden) {
      context.clearRect(0, 0, this.width, this.height)
      for (const column of this.columns) {
        column.y += column.speed * dt
        if (column.y - column.length * this.cell > this.height) column.y = -this.cell
        const row = Math.floor(column.y / this.cell)
        if (row !== column.row) { column.glyphs.unshift(glyph()); column.glyphs.length = column.length; column.row = row }
        for (let trail = column.length - 1; trail >= 0; trail--) {
          const y = column.y - trail * this.cell
          if (y < -this.cell || y > this.height) continue
          context.globalAlpha = trail === 0 ? .95 : Math.pow(1 - trail / column.length, 1.3) * .8
          context.fillStyle = trail === 0 ? '#d9ffe5' : trail < 3 ? '#7bf5a2' : trail < 8 ? '#36ae65' : '#17562d'
          context.fillText(column.glyphs[trail], column.x, y)
        }
      }
      if (this.glitch > .05) {
        context.globalAlpha = this.glitch * .38
        for (let index = 0; index < 4; index++) {
          context.fillStyle = index % 2 ? '#62ffe2' : '#f34366'
          context.fillRect(0, Math.random() * this.height, this.width * (.3 + Math.random() * .7), 1 + Math.random() * 5)
        }
      }
      context.globalAlpha = 1
    }
    this.frame = requestAnimationFrame(this.paint)
  }
  dispose() {
    cancelAnimationFrame(this.frame)
    this.observer?.disconnect()
    window.removeEventListener('resize', this.resize)
    this.columns = []
    this.context?.clearRect(0, 0, this.width, this.height)
  }
}
