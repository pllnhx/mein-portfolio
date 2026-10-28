export type TransitionPhase = 'idle' | 'covering' | 'switching' | 'revealing' | 'cleanup'
export type TransitionDirection = 'enter' | 'leave'
export type NavigationAction = 'PUSH' | 'REPLACE' | 'POP'
export type TransitionSettings = Readonly<Record<string, number | string | boolean>>
export type RouteMatcher = string | ((pathname: string) => boolean)
export interface RouteLocation { pathname: string; search?: string; hash?: string; key?: string }
export interface TransitionSelection { id: string; direction: TransitionDirection }
export interface TransitionResult { status: 'completed' | 'cancelled' | 'failed' | 'ignored'; committed: boolean; error?: string }
export interface TransitionSnapshot {
  phase: TransitionPhase
  effectId: string | null
  direction: TransitionDirection | null
  progress: number
  revealProgress: number
  error: string | null
}
export interface TransitionContext<S extends TransitionSettings = TransitionSettings> {
  mount: HTMLElement
  backdrop: HTMLElement
  source: HTMLElement
  from: RouteLocation
  to: RouteLocation
  action: NavigationAction
  duration: number
  settings: S
  signal: AbortSignal
  onProgress: (phase: 'covering' | 'revealing', progress: number) => void
}
export interface TransitionInstance {
  cover(): Promise<void>
  reveal(): Promise<void>
  /** Settles for both normal completion and cancellation. */
  finished: Promise<'completed' | 'cancelled'>
  cancel(reason?: string): void
  cleanup(): void
  seekReveal?(progress: number): void
}
export interface TransitionModule<S extends TransitionSettings = TransitionSettings> {
  id: string
  duration: number
  settings: S
  enter(context: TransitionContext<S>): TransitionInstance
  leave(context: TransitionContext<S>): TransitionInstance
}
export interface TransitionRegistration {
  id: string
  match: RouteMatcher
  priority?: number
  enterPriority?: number
  leavePriority?: number
  duration?: number
  settings?: TransitionSettings
  load: () => Promise<TransitionModule>
}
export interface RoutePairTransition {
  from: RouteMatcher
  to: RouteMatcher
  id: string
  direction: TransitionDirection
  priority?: number
}
export interface TransitionElements { host: HTMLElement; backdrop: HTMLElement; mount: HTMLElement; source: HTMLElement }
export interface TransitionRequest extends TransitionElements {
  from: RouteLocation
  to: RouteLocation
  action: NavigationAction
  reducedMotion: boolean
  selection?: TransitionSelection | null
  duration?: number
  settings?: TransitionSettings
  commit: (signal: AbortSignal) => Promise<void>
  ready: (signal: AbortSignal) => Promise<void>
}
