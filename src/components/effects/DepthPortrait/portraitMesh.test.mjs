import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildPortraitMesh, portraitProjection } from './portraitMesh.ts'
import { boundedPortraitPointer } from './portraitMath.ts'
import { PORTRAIT_SETTINGS } from './portraitAssets.ts'

const extremePointers = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
].map(([x, y]) => boundedPortraitPointer({ x, y }, PORTRAIT_SETTINGS.maxPointer))

function projected(mesh, index, pointer, projection) {
  const offset = index * 5
  const depth = mesh.vertices[offset + 4] - .5
  return [
    (mesh.vertices[offset] + pointer.x * (projection.rigidShift + projection.depthX * depth)) * projection.imageScale,
    (mesh.vertices[offset + 1] + pointer.y * (projection.rigidShift + projection.depthY * depth)) * projection.imageScale,
  ]
}

test('a hard cutout depth step keeps a single monotonic contour at extreme mouse positions', () => {
  const columns = 96, rows = 85, width = columns + 1
  const values = Float32Array.from({ length: width * (rows + 1) }, (_, index) => index % width < width / 2 ? 0 : .5)
  const mesh = buildPortraitMesh(values, columns, rows)
  const projection = portraitProjection(mesh)
  for (const pointer of extremePointers) {
    for (let row = 0; row <= rows; row++) {
      let previous = -Infinity
      for (let column = 0; column <= columns; column++) {
        const [x] = projected(mesh, row * width + column, pointer, projection)
        assert.ok(x > previous, 'a silhouette edge must not fold back into a second strip')
        previous = x
      }
    }
  }
})

test('sharp diagonal/checkerboard maps cannot invert triangles or escape the canvas gutter', () => {
  const columns = 48, rows = 42
  const values = Float32Array.from({ length: (columns + 1) * (rows + 1) }, (_, index) => {
    const x = index % (columns + 1), y = Math.floor(index / (columns + 1))
    return x > y + 4 || (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? 1 : 0
  })
  const mesh = buildPortraitMesh(values, columns, rows)
  const projection = portraitProjection(mesh)
  assert.ok(projection.depthX * mesh.maxGradientX + projection.depthY * mesh.maxGradientY <= .450001)
  for (const pointer of extremePointers) {
    const points = Array.from({ length: mesh.vertices.length / 5 }, (_, index) => projected(mesh, index, pointer, projection))
    assert.ok(points.every(([x, y]) => Math.abs(x) < 1 && Math.abs(y) < 1), 'extreme movement needs transparent space before the canvas border')
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const [a, b, c] = [points[mesh.indices[index]], points[mesh.indices[index + 1]], points[mesh.indices[index + 2]]]
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      assert.ok(area > 0, 'the deformed image must preserve triangle orientation')
    }
  }
})

test('flat near/far maps remain fully inside the drawing surface in all corners', () => {
  for (const depth of [0, .5, 1]) {
    const mesh = buildPortraitMesh(new Float32Array(9).fill(depth), 2, 2)
    const projection = portraitProjection(mesh)
    for (const pointer of extremePointers) {
      for (let index = 0; index < 9; index++) {
        assert.ok(projected(mesh, index, pointer, projection).every((coordinate) => Math.abs(coordinate) < 1))
      }
    }
  }
})

test('pointer diagonals saturate softly within the same radial limit', () => {
  for (const [x, y] of [[1, 0], [1, 1], [100, -100], [0, 0]]) {
    const pointer = boundedPortraitPointer({ x, y }, PORTRAIT_SETTINGS.maxPointer)
    assert.ok(Math.hypot(pointer.x, pointer.y) < PORTRAIT_SETTINGS.maxPointer)
  }
  const nearEdge = boundedPortraitPointer({ x: .99, y: 0 })
  const edge = boundedPortraitPointer({ x: 1, y: 0 })
  assert.ok(edge.x - nearEdge.x < .005, 'movement should ease toward the border')
})
