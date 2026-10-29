import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TransitionRegistry } from '../TransitionRegistry.ts'

const location = (pathname) => ({ pathname })
const entry = (id, priority = 0) => ({ id, match: `/${id}`, priority, load: async () => ({ id }) })

test('source leave wins ties; destination enter wins when its priority is higher', () => {
  const registry = new TransitionRegistry().register(entry('it')).register(entry('art'))
  assert.deepEqual(registry.resolve(location('/it'), location('/art')), { id: 'it', direction: 'leave' })
  assert.deepEqual(registry.resolve(location('/'), location('/it')), { id: 'it', direction: 'enter' })
  assert.equal(registry.resolve(location('/'), location('/other')), null)
  const priority = new TransitionRegistry().register(entry('it')).register(entry('art', 10))
  assert.deepEqual(priority.resolve(location('/it'), location('/art')), { id: 'art', direction: 'enter' })
})

test('direction priorities and explicit route pairs override generic selection', () => {
  const registry = new TransitionRegistry().register({ ...entry('it'), leavePriority: 50 }).register(entry('art', 10))
  assert.deepEqual(registry.resolve(location('/it'), location('/art')), { id: 'it', direction: 'leave' })
  registry.registerPair({ from: '/it', to: '/art', id: 'art', direction: 'enter' })
  assert.deepEqual(registry.resolve(location('/it'), location('/art')), { id: 'art', direction: 'enter' })
})

test('effects stay lazy, concurrent loads share a promise, and failed imports can retry', async () => {
  let loads = 0
  const registry = new TransitionRegistry().register({ id: 'it', match: '/it', load: async () => { loads++; return { id: 'it' } } })
  registry.resolve(location('/'), location('/it'))
  assert.equal(loads, 0)
  await Promise.all([registry.load('it'), registry.load('it')])
  assert.equal(loads, 1)
  let attempts = 0
  const retry = new TransitionRegistry().register({ id: 'retry', match: '/retry', load: async () => {
    if (++attempts === 1) throw new Error('chunk unavailable')
    return { id: 'retry' }
  } })
  await assert.rejects(retry.load('retry'))
  assert.equal((await retry.load('retry')).id, 'retry')
})
