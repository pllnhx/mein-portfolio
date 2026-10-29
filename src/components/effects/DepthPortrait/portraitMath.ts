export function normalizedPointer(x: number, y: number, bounds: { left: number; top: number; width: number; height: number }) {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  return {
    x: clamp(((x - bounds.left) / Math.max(1, bounds.width) - .5) * 2),
    y: clamp((.5 - (y - bounds.top) / Math.max(1, bounds.height)) * 2),
  }
}

export function smoothPointer(current: number, target: number, elapsed: number) {
  return current + (target - current) * (1 - Math.exp(-Math.min(64, elapsed) / 85))
}

/** Soft radial saturation avoids a stronger diagonal pull at viewport corners. */
export function boundedPortraitPointer(pointer: { x: number; y: number }, limit = .85) {
  const scale = limit / Math.sqrt(limit * limit + pointer.x * pointer.x + pointer.y * pointer.y)
  return { x: pointer.x * scale, y: pointer.y * scale }
}
