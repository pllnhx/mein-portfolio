import { PORTRAIT_SETTINGS } from './portraitAssets.ts'

export interface PortraitMesh {
  vertices: Float32Array
  indices: Uint16Array
  maxGradientX: number
  maxGradientY: number
}

/** Smooth geometry only. The photo and the full-resolution cutout stay untouched. */
function smoothDepth(values: Float32Array, width: number, height: number) {
  let source = Float32Array.from(values, (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .5)
  const weights = [1, 4, 6, 4, 1]
  for (let pass = 0; pass < 4; pass++) {
    const horizontal = pass % 2 === 0
    const target = new Float32Array(source.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let depth = 0
        for (let offset = -2; offset <= 2; offset++) {
          const sampleX = horizontal ? Math.max(0, Math.min(width - 1, x + offset)) : x
          const sampleY = horizontal ? y : Math.max(0, Math.min(height - 1, y + offset))
          depth += source[sampleY * width + sampleX] * weights[offset + 2]
        }
        target[y * width + x] = depth / 16
      }
    }
    source = target
  }
  return source
}

export function buildPortraitMesh(values: Float32Array, columns: number, rows: number): PortraitMesh {
  const width = columns + 1
  const height = rows + 1
  if (columns < 1 || rows < 1 || values.length !== width * height || width * height > 65536) throw new RangeError('Invalid portrait grid')
  const depths = smoothDepth(values, width, height)
  const vertices = new Float32Array(width * height * 5)
  const indices = new Uint16Array(columns * rows * 6)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const u = x / columns
      const v = 1 - y / rows
      vertices.set([u * 2 - 1, v * 2 - 1, u, v, depths[index]], index * 5)
    }
  }
  let cursor = 0
  let maxGradientX = 0
  let maxGradientY = 0
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const topLeft = y * width + x
      const topRight = topLeft + 1
      const bottomLeft = topLeft + width
      const bottomRight = bottomLeft + 1
      indices.set([topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight], cursor)
      cursor += 6
      maxGradientX = Math.max(maxGradientX, Math.abs(depths[topRight] - depths[topLeft]) * columns / 2, Math.abs(depths[bottomRight] - depths[bottomLeft]) * columns / 2)
      maxGradientY = Math.max(maxGradientY, Math.abs(depths[bottomLeft] - depths[topLeft]) * rows / 2, Math.abs(depths[bottomRight] - depths[topRight]) * rows / 2)
    }
  }
  return { vertices, indices, maxGradientX, maxGradientY }
}

export function readPortraitMesh(image: HTMLImageElement) {
  const columns = 96
  const rows = Math.max(24, Math.min(128, Math.round(columns * image.naturalHeight / image.naturalWidth)))
  const canvas = document.createElement('canvas')
  canvas.width = columns + 1
  canvas.height = rows + 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Depth sampling unavailable')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const values = Float32Array.from({ length: canvas.width * canvas.height }, (_, index) => data[index * 4] / 255)
  return buildPortraitMesh(values, columns, rows)
}

export function portraitProjection(mesh: Pick<PortraitMesh, 'maxGradientX' | 'maxGradientY'>) {
  const x = PORTRAIT_SETTINGS.parallax * 1.7
  const y = PORTRAIT_SETTINGS.parallax * 1.2
  const slope = x * mesh.maxGradientX + y * mesh.maxGradientY
  // A positive Jacobian prevents folds, duplicate silhouettes and reversed cells,
  // even if a replacement depth map contains extreme discontinuities.
  const safeStrength = slope > 0 ? Math.min(1, .45 / slope) : 1
  return { depthX: x * safeStrength, depthY: y * safeStrength, rigidShift: .01, imageScale: 1 / (1 + 2 * PORTRAIT_SETTINGS.gutter) }
}
