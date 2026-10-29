export const GLASS_GRID = 64
export const GLASS_MAX_CARDS = 16
export const GLASS_RADIUS = 34
export const GLASS_BACKGROUND_PARALLAX = .6

/** Negative sample offset makes the pattern travel at 40% of normal scroll. */
export function glassBackgroundOffset(sectionTop: number, reducedMotion = false) {
  return reducedMotion || sectionTop >= 0 ? 0 : sectionTop * GLASS_BACKGROUND_PARALLAX
}

export interface GlassRect { left: number; top: number; width: number; height: number }

/** Coordinates stay in section CSS pixels, independent of scroll and DPR. */
export function visibleGlassArea(section: GlassRect, viewportHeight: number) {
  const top = Math.max(0, -section.top)
  const height = Math.max(0, Math.min(section.height - top, viewportHeight - Math.max(0, section.top)))
  return { top, height, width: section.width }
}

export function glassCardRect(card: GlassRect, section: GlassRect) {
  return [card.left - section.left, card.top - section.top, card.width, card.height]
}

export function glassResolution(width: number, height: number, deviceDpr: number) {
  const dpr = Math.min(1.5, Math.max(1, deviceDpr || 1), Math.sqrt(2_000_000 / Math.max(1, width * height)))
  return { width: Math.max(1, Math.round(width * dpr)), height: Math.max(1, Math.round(height * dpr)), dpr }
}
