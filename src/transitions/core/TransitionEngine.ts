import type { TransitionContext, TransitionInstance, TransitionRequest, TransitionResult, TransitionSnapshot } from '../types.ts'
import { TransitionRegistry } from '../TransitionRegistry.ts'
import { basicTransition } from './basicTransition.ts'
import { guarded } from './async.ts'

const initial: TransitionSnapshot = { phase: 'idle', effectId: null, direction: null, progress: 0, revealProgress: 0, error: null }

/** Navigation and effect lifecycles only. No knowledge of any theme or page. */
export class TransitionEngine {
  private snapshot: TransitionSnapshot = initial
  private listeners = new Set<() => void>()
  private controller: AbortController | null = null
  private instance: TransitionInstance | null = null
  private skipReveal = false
  private registry: TransitionRegistry
  constructor(registry: TransitionRegistry) { this.registry = registry }
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback) } }
  getSnapshot = () => this.snapshot
  get busy() { return this.snapshot.phase !== 'idle' }
  private update(change: Partial<TransitionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }
  cancel = () => {
    this.skipReveal = true
    this.instance?.cancel('Cancelled by caller')
    // Once switching starts, finish mounting the committed destination under black.
    if (this.snapshot.phase !== 'switching') this.controller?.abort()
  }
  dispose = () => { this.controller?.abort(); this.instance?.cancel('Disposed') }
  seekReveal = (progress: number) => this.instance?.seekReveal?.(Math.max(0, Math.min(1, progress)))

  async run(request: TransitionRequest): Promise<TransitionResult> {
    if (this.busy) return { status: 'ignored', committed: false }
    const selection = request.selection === undefined ? this.registry.resolve(request.from, request.to) : request.selection
    const configuration = selection ? this.registry.configuration(selection.id) : undefined
    const controller = new AbortController()
    this.controller = controller
    this.skipReveal = false
    let committed = false
    let commitPromise: Promise<void> | null = null
    let result: TransitionResult
    request.host.dataset.active = 'true'
    request.backdrop.style.opacity = '0'
    this.update({ ...initial, phase: 'covering', effectId: selection?.id ?? null, direction: selection?.direction ?? null })
    const context: TransitionContext = {
      mount: request.mount, backdrop: request.backdrop, source: request.source,
      from: request.from, to: request.to, action: request.action,
      duration: request.duration ?? .16, settings: request.settings ?? {}, signal: controller.signal,
      onProgress: (phase, value) => {
        if (this.snapshot.phase !== phase) return
        const progress = Math.max(0, Math.min(1, value))
        const previous = phase === 'revealing' ? this.snapshot.revealProgress : this.snapshot.progress
        if (Math.abs(progress - previous) >= .02 || progress === 1) {
          this.update(phase === 'revealing' ? { revealProgress: progress } : { progress })
        }
      },
    }
    const switchRoute = async () => {
      // Structural guarantee: never trust an effect alone to cover the route commit.
      request.backdrop.style.transition = 'none'
      request.backdrop.style.opacity = '1'
      this.update({ phase: 'switching', progress: 1 })
      commitPromise ??= request.commit(controller.signal)
      await guarded(commitPromise, controller.signal)
      committed = true
      await guarded(request.ready(controller.signal), controller.signal, 8000)
    }
    try {
      if (selection && !request.reducedMotion) {
        try {
          const module = await guarded(this.registry.load(selection.id), controller.signal, 6000)
          context.duration = request.duration ?? configuration?.duration ?? module.duration
          context.settings = { ...module.settings, ...configuration?.settings, ...request.settings }
          this.instance = module[selection.direction](context)
        } catch (error) {
          if (controller.signal.aborted) throw error
          this.update({ error: 'Effect could not be loaded; using neutral fallback.' })
          this.instance = basicTransition(context)
        }
      } else this.instance = basicTransition(context, request.reducedMotion ? .1 : .16)
      await guarded(this.instance.cover(), controller.signal, Math.max(4000, context.duration * 3000))
      await switchRoute()
      if (!this.skipReveal) {
        this.update({ phase: 'revealing', revealProgress: 0 })
        request.backdrop.style.removeProperty('transition')
        await guarded(this.instance.reveal(), controller.signal, Math.max(4000, context.duration * 3000))
        await guarded(this.instance.finished, controller.signal, 1000)
      }
      result = { status: this.skipReveal ? 'cancelled' : 'completed', committed }
    } catch (error) {
      if (controller.signal.aborted) result = { status: 'cancelled', committed }
      else {
        const message = error instanceof Error ? error.message : 'Transition failed'
        this.update({ error: message })
        try { this.instance?.cancel(message); this.instance?.cleanup() } catch { /* Isolate broken module cleanup. */ }
        this.instance = null
        request.mount.replaceChildren()
        // A broken visual module must not break navigation or leave an opaque screen.
        try {
          request.backdrop.style.transition = 'none'
          request.backdrop.style.opacity = '1'
          if (!committed) await switchRoute()
          this.instance = basicTransition(context)
          this.update({ phase: 'revealing' })
          await this.instance.reveal()
        } catch { /* The router owns route errors; cleanup always removes the overlay. */ }
        result = { status: 'failed', committed, error: message }
      }
    } finally {
      this.update({ phase: 'cleanup' })
      try { this.instance?.cleanup() } catch {
        this.update({ error: 'Effect cleanup failed; overlay was removed.' })
      } finally {
        request.mount.replaceChildren()
        request.backdrop.style.removeProperty('transition')
        request.backdrop.style.opacity = '0'
        delete request.host.dataset.active
        this.instance = null
        this.controller = null
        this.update({ phase: 'idle', progress: 1, revealProgress: committed ? 1 : 0 })
      }
    }
    return { ...result, committed }
  }
}
