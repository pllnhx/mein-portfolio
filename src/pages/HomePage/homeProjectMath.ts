export const PROJECT_END_GAP = 48
export const PROJECT_SCROLL_RATE = .30
export const PROJECT_MOBILE_SCROLL_RATE = .18

/** Reserve exactly the space consumed by the content's slower scroll motion. */
export function projectScrollLayout(contentBottom: number, viewportHeight: number, sectionTop: number, rate: number) {
  const safeRate = Math.max(0, Math.min(.6, rate))
  const extraSpace = Math.max(0, contentBottom + PROJECT_END_GAP - viewportHeight) * safeRate / (1 - safeRate)
  const drift = Math.min(extraSpace, Math.max(0, -sectionTop) * safeRate)
  return { extraSpace, drift }
}
