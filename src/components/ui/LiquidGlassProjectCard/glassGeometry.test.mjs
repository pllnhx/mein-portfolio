import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GLASS_GRID, glassBackgroundOffset, glassCardRect, glassResolution, visibleGlassArea } from './glassGeometry.ts'

test('a long section allocates only its visible viewport, including its first/last edge', () => {
  assert.deepEqual(visibleGlassArea({ left: 0, top: 500, width: 1200, height: 5000 }, 800), { top: 0, height: 300, width: 1200 })
  assert.deepEqual(visibleGlassArea({ left: 0, top: -1700, width: 1200, height: 5000 }, 800), { top: 1700, height: 800, width: 1200 })
  assert.deepEqual(visibleGlassArea({ left: 0, top: -4800, width: 1200, height: 5000 }, 800), { top: 4800, height: 200, width: 1200 })
  assert.equal(visibleGlassArea({ left: 0, top: 900, width: 1200, height: 5000 }, 800).height, 0)
})

test('card/refraction coordinates and grid phase stay registered while scrolling', () => {
  const section = { left: 0, top: 500, width: 1200, height: 3000 }
  const card = { left: 80, top: 900, width: 350, height: 340 }
  const origin = glassCardRect(card, section)
  for (const scroll of [1, 500, 1001, 1700]) {
    assert.deepEqual(glassCardRect({ ...card, top: card.top - scroll }, { ...section, top: section.top - scroll }), origin)
    const area = visibleGlassArea({ ...section, top: section.top - scroll }, 800)
    const viewY = card.top - scroll - Math.max(0, section.top - scroll)
    assert.equal((viewY + area.top) % GLASS_GRID, origin[1] % GLASS_GRID)
  }
})

test('DPR is capped and the buffer budget holds on large and mobile screens', () => {
  for (const [width, height, dpr] of [[390, 844, 3], [1920, 1080, 2], [3840, 2160, 2]]) {
    const buffer = glassResolution(width, height, dpr)
    assert.ok(buffer.dpr <= 1.5)
    assert.ok(buffer.width * buffer.height <= 2_005_000)
    assert.ok(Math.abs(buffer.width / buffer.height - width / height) < .003)
  }
})

test('background samples move at 40% of scrolling while card geometry remains independent', () => {
  const viewportY = 200
  const beforeTop = -100, afterTop = -300
  const before = viewportY - beforeTop + glassBackgroundOffset(beforeTop)
  const after = viewportY - afterTop + glassBackgroundOffset(afterTop)
  assert.equal(after - before, 80, '200px of scroll must move background by only80px')
  assert.equal(glassBackgroundOffset(200), 0, 'entry edge stays anchored')
  assert.equal(glassBackgroundOffset(-300, true), 0)
  // The parent may slow DOM content by an additional translateY; lenses use
  // those actual bounds, never the background sampling offset.
  assert.deepEqual(glassCardRect({ left: 80, top: 60, width: 350, height: 340 }, { left: 0, top: -300, width: 1200, height: 3000 }), [80, 360, 350, 340])
})
