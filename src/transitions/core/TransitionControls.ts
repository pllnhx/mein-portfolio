import { createContext, useContext, useLayoutEffect } from 'react'
import type { TransitionSnapshot } from '../types'

export interface TransitionControls {
  snapshot: TransitionSnapshot
  cancel: () => void
  deferReveal: (promise: Promise<unknown>) => () => void
}
export const TransitionControlsContext = createContext<TransitionControls | null>(null)
export function usePageTransition() {
  const value = useContext(TransitionControlsContext)
  if (!value) throw new Error('usePageTransition requires PageTransitionManager')
  return value
}
/** Optional: register async page initialization before the reveal may start. */
export function useTransitionReady(promise: Promise<unknown>) {
  const { deferReveal } = usePageTransition()
  useLayoutEffect(() => deferReveal(promise), [deferReveal, promise])
}
