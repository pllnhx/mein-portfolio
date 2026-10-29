import type { RouteLocation, RouteMatcher, RoutePairTransition, TransitionModule, TransitionRegistration, TransitionSelection } from './types.ts'

const matches = (matcher: RouteMatcher, pathname: string) => typeof matcher === 'string' ? matcher === pathname : matcher(pathname)

export class TransitionRegistry {
  private registrations = new Map<string, TransitionRegistration>()
  private loaded = new Map<string, Promise<TransitionModule>>()
  private pairs: RoutePairTransition[] = []

  register(registration: TransitionRegistration) {
    if (this.registrations.has(registration.id)) throw new Error(`Duplicate transition: ${registration.id}`)
    this.registrations.set(registration.id, registration)
    return this
  }

  registerPair(pair: RoutePairTransition) {
    if (!this.registrations.has(pair.id)) throw new Error(`Unknown transition: ${pair.id}`)
    this.pairs.push(pair)
    return this
  }

  configuration(id: string) {
    const registration = this.registrations.get(id)
    return { duration: registration?.duration, settings: registration?.settings }
  }

  resolve(from: RouteLocation, to: RouteLocation): TransitionSelection | null {
    const pair = this.pairs.filter((entry) => matches(entry.from, from.pathname) && matches(entry.to, to.pathname))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0]
    if (pair) return { id: pair.id, direction: pair.direction }
    const candidates: (TransitionSelection & { priority: number })[] = []
    for (const entry of this.registrations.values()) {
      if (matches(entry.match, from.pathname)) candidates.push({ id: entry.id, direction: 'leave', priority: entry.leavePriority ?? entry.priority ?? 0 })
      if (matches(entry.match, to.pathname)) candidates.push({ id: entry.id, direction: 'enter', priority: entry.enterPriority ?? entry.priority ?? 0 })
    }
    candidates.sort((a, b) => b.priority - a.priority || Number(b.direction === 'leave') - Number(a.direction === 'leave'))
    const selected = candidates[0]
    return selected ? { id: selected.id, direction: selected.direction } : null
  }

  load(id: string) {
    const registration = this.registrations.get(id)
    if (!registration) return Promise.reject(new Error(`Unknown transition: ${id}`))
    let promise = this.loaded.get(id)
    if (!promise) {
      promise = registration.load().then((module) => {
        if (module.id !== id) throw new Error(`Transition id mismatch: ${id}`)
        return module
      }).catch((error: unknown) => { this.loaded.delete(id); throw error })
      this.loaded.set(id, promise)
    }
    return promise
  }
}
