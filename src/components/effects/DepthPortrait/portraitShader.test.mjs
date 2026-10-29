import assert from 'node:assert/strict'
import { test } from 'node:test'
import { portraitFragmentShader, portraitVertexShader } from './shaders.ts'

// GLSL ES 1.00: a shared uniform is one storage location, so its type AND
// precision must match between stages. Vertex floats default to highp.
function floatUniforms(source, stage) {
  const code = source.replace(/\/\/[^\n]*/g, '')
  const defaultPrecision = code.match(/precision\s+(lowp|mediump|highp)\s+float\s*;/)?.[1]
    ?? (stage === 'vertex' ? 'highp' : undefined)
  return new Map(Array.from(code.matchAll(/uniform\s+(?:(lowp|mediump|highp)\s+)?(float|vec[234])\s+(\w+)\s*;/g),
    ([, precision, type, name]) => [name, { type, precision: precision ?? defaultPrecision }]))
}

test('shared portrait uniforms satisfy the WebGL 1 shader linking contract', () => {
  const vertex = floatUniforms(portraitVertexShader, 'vertex')
  const fragment = floatUniforms(portraitFragmentShader, 'fragment')
  assert.ok(vertex.has('uPointer') && fragment.has('uPointer'), 'mouse movement must drive geometry and visor light')
  for (const [name, declaration] of vertex) {
    if (fragment.has(name)) assert.deepEqual(declaration, fragment.get(name), `${name}: mismatched type/precision makes WebGL reject the program`)
  }
})
