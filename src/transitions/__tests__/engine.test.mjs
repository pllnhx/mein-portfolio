import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { TransitionEngine } from '../core/TransitionEngine.ts'
import { TransitionRegistry } from '../TransitionRegistry.ts'

const defer = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }
const waitFor = async (predicate) => { for (let index = 0; index < 200; index++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 2)) } throw new Error('Timed out') }
function fixture() {
  const document = new JSDOM('<div id="source">old</div><div id="host"><div id="backdrop"></div><div id="mount"></div></div>').window.document
  const cover = defer(), reveal = defer(), ready = defer(), commit = defer()
  let commits = 0, cleanups = 0, cancels = 0, reveals = 0
  const instance = {
    cover: () => cover.promise,
    reveal: () => { reveals++; return reveal.promise },
    finished: Promise.resolve('completed'),
    cancel: () => { cancels++ },
    cleanup: () => { cleanups++ },
  }
  const registry = new TransitionRegistry().register({ id: 'test', match: '/test', load: async () => ({ id: 'test', duration: .1, settings: {}, enter: () => instance, leave: () => instance }) })
  const engine = new TransitionEngine(registry)
  const elements = Object.fromEntries(['source', 'host', 'backdrop', 'mount'].map((id) => [id, document.getElementById(id)]))
  const request = {
    ...elements, from: { pathname: '/' }, to: { pathname: '/test' }, action: 'PUSH', reducedMotion: false,
    commit: async () => { commits++; await commit.promise; elements.source.textContent = 'new' },
    ready: () => ready.promise,
  }
  return { engine, registry, request, cover, reveal, ready, commit, elements, get stats() { return { commits, cleanups, cancels, reveals } } }
}

test('route commits only under an opaque overlay; reveal waits for destination readiness', async () => {
  const f = fixture()
  const phases = []
  f.engine.subscribe(() => { const phase = f.engine.getSnapshot().phase; if (phases.at(-1) !== phase) phases.push(phase) })
  const running = f.engine.run(f.request)
  await waitFor(() => f.engine.getSnapshot().phase === 'covering')
  assert.equal(f.stats.commits, 0)
  assert.equal((await f.engine.run(f.request)).status, 'ignored')
  f.cover.resolve()
  await waitFor(() => f.stats.commits === 1)
  assert.equal(f.elements.backdrop.style.opacity, '1')
  assert.equal(f.elements.source.textContent, 'old')
  f.commit.resolve()
  await waitFor(() => f.elements.source.textContent === 'new')
  assert.equal(f.stats.reveals, 0)
  assert.equal(f.engine.getSnapshot().phase, 'switching')
  f.ready.resolve()
  await waitFor(() => f.stats.reveals === 1)
  f.reveal.resolve()
  assert.deepEqual(await running, { status: 'completed', committed: true })
  assert.deepEqual(phases, ['covering', 'switching', 'revealing', 'cleanup', 'idle'])
  assert.equal(f.stats.cleanups, 1)
  assert.equal(f.elements.host.dataset.active, undefined)
  assert.equal(f.elements.backdrop.style.opacity, '0')
})

test('cancelling before cover completion keeps the old route and always disposes the overlay', async () => {
  const f = fixture()
  const running = f.engine.run(f.request)
  await waitFor(() => f.engine.getSnapshot().effectId === 'test')
  f.engine.cancel()
  assert.deepEqual(await running, { status: 'cancelled', committed: false })
  assert.equal(f.stats.commits, 0)
  assert.equal(f.elements.host.dataset.active, undefined)
  assert.equal(f.engine.getSnapshot().phase, 'idle')
})

test('cancelling during switching finishes mounting before removing the cover', async () => {
  const f = fixture()
  const running = f.engine.run(f.request)
  f.cover.resolve()
  await waitFor(() => f.stats.commits === 1)
  f.engine.cancel()
  assert.equal(f.elements.backdrop.style.opacity, '1')
  assert.equal(f.engine.getSnapshot().phase, 'switching')
  f.commit.resolve()
  f.ready.resolve()
  assert.deepEqual(await running, { status: 'cancelled', committed: true })
  assert.equal(f.stats.reveals, 0)
  assert.equal(f.elements.source.textContent, 'new')
})

test('reduced motion never imports the themed module', async () => {
  const f = fixture()
  let loaded = false
  f.registry.load = async () => { loaded = true; throw new Error('should not load') }
  f.commit.resolve(); f.ready.resolve()
  const result = await f.engine.run({ ...f.request, reducedMotion: true })
  assert.equal(loaded, false)
  assert.equal(result.status, 'completed')
  assert.equal(f.elements.host.dataset.active, undefined)
})

test('a failed effect import falls back and navigation remains usable', async () => {
  const f = fixture()
  f.registry.load = async () => { throw new Error('offline') }
  f.commit.resolve(); f.ready.resolve()
  const result = await f.engine.run(f.request)
  assert.equal(result.committed, true)
  assert.equal(f.engine.getSnapshot().phase, 'idle')
  assert.equal(f.elements.host.dataset.active, undefined)
  assert.ok(f.engine.getSnapshot().error.includes('fallback'))
})

test('a broken animation and cleanup cannot prevent the route switch or strand the overlay', async () => {
  const f = fixture()
  let cleanups = 0
  const broken = {
    cover: async () => { throw new Error('broken cover') },
    reveal: async () => {},
    finished: Promise.resolve('cancelled'),
    cancel() {},
    cleanup() { cleanups++; throw new Error('broken cleanup') },
  }
  f.registry.load = async () => ({ id: 'test', duration: .1, settings: {}, enter: () => broken, leave: () => broken })
  f.commit.resolve(); f.ready.resolve()
  const result = await f.engine.run(f.request)
  assert.equal(result.status, 'failed')
  assert.equal(result.committed, true)
  assert.equal(cleanups, 1)
  assert.equal(f.stats.commits, 1)
  assert.equal(f.elements.host.dataset.active, undefined)
  assert.equal(f.elements.backdrop.style.opacity, '0')
})

test('a rejected page readiness promise is not retried and still releases the overlay', async () => {
  const f = fixture()
  let readinessCalls = 0
  f.commit.resolve()
  f.cover.resolve()
  const result = await f.engine.run({ ...f.request, ready: async () => { readinessCalls++; throw new Error('page setup failed') } })
  assert.equal(result.status, 'failed')
  assert.equal(result.committed, true)
  assert.equal(readinessCalls, 1)
  assert.equal(f.stats.commits, 1)
  assert.equal(f.elements.host.dataset.active, undefined)
})
