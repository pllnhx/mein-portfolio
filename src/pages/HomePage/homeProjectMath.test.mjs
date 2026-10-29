import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PROJECT_END_GAP, PROJECT_MOBILE_SCROLL_RATE, PROJECT_SCROLL_RATE, projectScrollLayout } from './homeProjectMath.ts'

test('slower project content gets exactly enough scroll space to reach the footer', () => {
  for (const [bottom, viewport, rate] of [[1250, 900, PROJECT_SCROLL_RATE], [3100, 740, PROJECT_MOBILE_SCROLL_RATE]]) {
    const { extraSpace } = projectScrollLayout(bottom, viewport, 0, rate)
    assert.ok(extraSpace > 0, 'viewing all projects must require additional scrolling')
    const endTop = viewport - (bottom + PROJECT_END_GAP + extraSpace)
    const { drift } = projectScrollLayout(bottom, viewport, endTop, rate)
    assert.ok(Math.abs(drift - extraSpace) < .0001, 'the footer must reach the bottom with no empty scroll tail')
    const footerOnScreen = endTop + bottom + drift
    assert.ok(Math.abs(footerOnScreen - (viewport - PROJECT_END_GAP)) < .0001)
  }
})

test('cards move at the configured slower speed while their background can move independently', () => {
  const start = projectScrollLayout(2200, 900, -100, PROJECT_SCROLL_RATE)
  const end = projectScrollLayout(2200, 900, -300, PROJECT_SCROLL_RATE)
  const actualTravel = 200 - (end.drift - start.drift)
  assert.ok(Math.abs(actualTravel - 200 * (1 - PROJECT_SCROLL_RATE)) < .0001)
  assert.deepEqual(projectScrollLayout(2200, 900, 500, PROJECT_SCROLL_RATE).drift, 0)
})

test('short filtered lists and reduced motion have no artificial scroll tail', () => {
  assert.deepEqual(projectScrollLayout(400, 900, -100, PROJECT_SCROLL_RATE), { extraSpace: 0, drift: 0 })
  assert.deepEqual(projectScrollLayout(3100, 740, -800, 0), { extraSpace: 0, drift: 0 })
})
