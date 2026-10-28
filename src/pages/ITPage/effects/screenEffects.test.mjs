import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { startScreenEffects } from './screenEffects.ts'
import { chooseTone } from './effectTiming.ts'

const descriptors = new Map()

function environment() {
  let timerId = 0
  const timers = new Map()
  const listeners = new Map()
  for (const [name, value] of Object.entries({
    window: {
      setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId },
      clearTimeout: (id) => timers.delete(id),
    },
    document: {
      hidden: false,
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    },
  })) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { configurable: true, value })
  }
  return {
    timers, listeners,
    fire() {
      assert.equal(timers.size, 1, 'only one screen timer should exist')
      const [id, timer] = timers.entries().next().value
      timers.delete(id)
      timer.callback()
      return timer.delay
    },
  }
}

afterEach(() => {
  mock.restoreAll()
  descriptors.forEach((descriptor, name) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  })
  descriptors.clear()
})

test('screen interference uses the requested interval/opacity and stays brief', () => {
  const env = environment()
  mock.method(Math, 'random', () => .5)
  const events = []
  const stop = startScreenEffects((event) => events.push(event))
  assert.equal(env.fire(), 27500)
  assert.deepEqual(events.at(-1), { duration: 1450, opacity: .5 })
  assert.equal(env.fire(), 1450)
  assert.equal(events.at(-1), null)
  assert.equal(env.fire() + 1450, 27500, 'start-to-start interval excludes the overlay duration')
  stop()
  assert.equal(env.timers.size, 0)
  assert.equal(env.listeners.size, 0)
  assert.equal(events.at(-1), null)
})

test('hidden pages skip screen events and resume with a fresh delay', () => {
  const env = environment()
  mock.method(Math, 'random', () => 0)
  const events = []
  const stop = startScreenEffects((event) => events.push(event))
  document.hidden = true
  assert.equal(env.fire(), 15000)
  assert.equal(events.length, 0)
  document.hidden = false
  env.listeners.get('visibilitychange')()
  assert.equal(env.fire(), 15000)
  assert.deepEqual(events.at(-1), { duration: 1200, opacity: .4 })
  stop()
})

test('40% of the random range selects red/cyan and 60% selects monochrome', () => {
  mock.method(Math, 'random', () => .399)
  assert.equal(chooseTone(), 'color')
  mock.method(Math, 'random', () => .4)
  assert.equal(chooseTone(), 'mono')
})
