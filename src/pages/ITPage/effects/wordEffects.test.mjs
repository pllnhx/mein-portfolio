import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { startWordEffects } from './wordEffects.ts'
import { SCRAMBLE_DURATION, scrambleFrame } from './effectTiming.ts'
import { textEffectsFixture } from './textEffectsFixture.mjs'

const originals = new Map()

function install(name, value) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
}

afterEach(() => {
  mock.restoreAll()
  originals.forEach((descriptor, name) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  })
  originals.clear()
})

function environment() {
  let clock = 0
  let interval
  let mutation
  let disconnected = false
  const listeners = new Map()
  const fixture = textEffectsFixture()
  mock.method(performance, 'now', () => clock)
  mock.method(Math, 'random', () => .5)
  install('window', {
    innerHeight: 900, innerWidth: 1200,
    setInterval: (callback) => { interval = callback; return 1 },
    clearInterval: () => { interval = undefined },
  })
  install('document', {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  })
  install('getComputedStyle', () => ({ fontSize: '16px' }))
  install('MutationObserver', class {
    constructor(callback) { mutation = callback }
    observe() {}
    disconnect() { disconnected = true }
  })
  return {
    ...fixture, listeners,
    get phase() { return fixture.phase },
    get scrambleText() { return fixture.scrambleText },
    get selectedCharacters() { return fixture.selectedCharacters },
    advance: (time) => { clock = time; interval?.() },
    change: () => mutation(),
    get stopped() { return !interval && disconnected && listeners.size === 0 },
  }
}

test('a page-wide glitch waits 3–10 seconds and lasts 0.5–1.5 seconds', () => {
  const env = environment()
  const word = env.word('Neugier')
  const stop = startWordEffects(env.root)
  env.advance(6499)
  assert.equal(word.dataset.effect, undefined)
  env.advance(6500)
  assert.equal(word.dataset.effect, 'glitch')
  assert.equal(word.dataset.tone, 'mono')
  assert.equal(word.properties.get('--word-glitch-duration'), '1000ms')
  env.advance(7000)
  assert.equal(word.dataset.effect, 'glitch')
  env.advance(7501)
  assert.equal(word.dataset.effect, undefined)
  assert.equal(word.dataset.terminalWord, 'Neugier')
  assert.equal(word.properties.size, 0)
  stop()
  assert.ok(env.stopped)
})

test('many words still produce one batch per interval, with at most three effects including scramble', () => {
  const env = environment()
  Array.from({ length: 100 }, (_, index) => env.word(`word${index}`))
  const count = env.count
  const stop = startWordEffects(env.root)
  env.advance(6500)
  assert.equal(count('glitch'), 2)
  env.advance(7501)
  env.advance(11499)
  assert.equal(count(), 0, 'no individual-word timers may start additional glitches')
  env.advance(11500)
  assert.equal(count('scramble'), 1)
  env.advance(13000)
  assert.equal(count('glitch'), 2)
  assert.equal(count(), 3)
  env.advance(14001)
  assert.equal(count(), 1)
  stop()
})

test('a maximum-size batch animates three distinct words', () => {
  const env = environment()
  Array.from({ length: 10 }, (_, index) => env.word(`word${index}`))
  const stop = startWordEffects(env.root)
  mock.method(Math, 'random', () => .999)
  env.advance(6500)
  assert.equal(env.count('glitch'), 3)
  env.advance(8000)
  env.advance(11500)
  assert.equal(env.count('scramble'), 1)
  stop()
  assert.ok(env.words.every((word) => word.dataset.effect === undefined))
})

test('an imminent scramble starts on time while at most three words are animated', () => {
  const env = environment()
  Array.from({ length: 10 }, (_, index) => env.word(`word${index}`))
  const stop = startWordEffects(env.root)
  mock.method(Math, 'random', () => .2)
  env.advance(6500)
  env.advance(7300)
  mock.method(Math, 'random', () => .999)
  env.advance(10900)
  assert.equal(env.count('glitch'), 2)
  env.advance(11500)
  assert.equal(env.count('scramble'), 1)
  assert.equal(env.count(), 3)
  stop()
})

test('scramble starts independently after 8–15 seconds and slowly restores the exact original', () => {
  const env = environment()
  // A title word is exempt from generic glitches, but is eligible for scramble.
  const word = env.word('TypeScript', { title: true })
  const stop = startWordEffects(env.root)
  env.advance(6500)
  assert.equal(word.dataset.effect, undefined)
  env.advance(11499)
  assert.equal(word.dataset.effect, undefined)
  env.advance(11500)
  assert.equal(word.dataset.scrambleActive, 'true')
  assert.equal(env.phase, 'tint')
  assert.equal(env.scrambleText, 'TypeScript')
  env.advance(12500)
  assert.equal(env.phase, 'corrupt')
  assert.notEqual(env.scrambleText, 'TypeScript')
  env.advance(13600)
  assert.equal(env.phase, 'resolve')
  assert.notEqual(env.scrambleText, 'GHOST MODE')
  env.advance(14500)
  assert.equal(env.phase, 'hold')
  assert.equal(env.scrambleText, 'GHOST MODE')
  env.advance(15700)
  assert.equal(env.phase, 'dissolve')
  assert.notEqual(env.scrambleText, 'GHOST MODE')
  env.advance(16800)
  assert.equal(env.phase, 'restore')
  env.advance(17700)
  assert.equal(env.phase, 'untint')
  assert.equal(env.scrambleText, 'TypeScript')
  env.advance(11500 + SCRAMBLE_DURATION + 1)
  assert.equal(word.dataset.effect, undefined)
  assert.equal(env.phase, undefined)
  assert.equal(env.scrambleText, '')
  assert.equal(word.dataset.terminalWord, 'TypeScript')
  assert.equal(word.properties.size, 0)
  stop()
})

test('scramble cadence is not delayed by glitch cadence', () => {
  const env = environment()
  const word = env.word('Coding', { title: true })
  const stop = startWordEffects(env.root)
  env.advance(11500)
  assert.equal(word.dataset.scrambleActive, 'true')
  env.advance(18201)
  assert.equal(word.dataset.effect, undefined)
  env.advance(22999)
  assert.equal(word.dataset.effect, undefined)
  env.advance(23000)
  assert.equal(word.dataset.scrambleActive, 'true')
  assert.equal(env.phase, 'tint')
  stop()
})

test('a multi-word scramble changes only the selected characters and counts every affected word', () => {
  const env = environment()
  const run = env.run('und die Neugier')
  env.word('abc')
  env.word('xyz')
  const original = run.characters.map((character) => character.dataset.terminalCharacter).join('')
  const stop = startWordEffects(env.root)
  env.advance(11500)
  assert.equal(env.count('scramble'), 3)
  assert.equal(env.count('glitch'), 0)
  assert.equal(env.selectedCharacters.length, 12)
  assert.equal(run.characters.filter((character) => !character.dataset.scramblePhase).length, 3)
  env.advance(14500)
  assert.equal(env.scrambleText, 'FIREWALL OFF')
  assert.equal(env.selectedCharacters.map((character) => character.overlay.querySelector('[data-terminal-glyph]').textContent).join(''), 'FIREWALL OFF')
  assert.equal(run.characters.map((character) => character.dataset.terminalCharacter).join(''), original)
  assert.ok(run.words.every((word) => word.properties.size === 0))
  stop()
  assert.ok(run.characters.every((character) => !character.dataset.scramblePhase))
  assert.ok(run.words.every((word) => !word.dataset.scrambleActive))
})

test('off-screen words stay quiet and newly rendered words join the global clock', () => {
  const env = environment()
  const hidden = env.word('Footer', { top: 1200 })
  const stop = startWordEffects(env.root)
  env.advance(6500)
  assert.equal(hidden.dataset.effect, undefined)
  const replacement = env.word('Vite')
  env.change()
  env.advance(11500)
  assert.equal(replacement.dataset.scrambleActive, 'true')
  env.words.splice(1, 1)
  env.change()
  env.advance(11580)
  assert.equal(replacement.dataset.scrambleActive, undefined)
  assert.ok(replacement.characters.every((character) => character.dataset.scramblePhase === undefined))
  assert.equal(replacement.properties.size, 0)
  stop()
  assert.ok(env.stopped)
})

test('hiding the document clears active effects and prevents catch-up bursts', () => {
  const env = environment()
  const word = env.word('Projekte')
  const stop = startWordEffects(env.root)
  env.advance(6500)
  assert.equal(word.dataset.effect, 'glitch')
  document.hidden = true
  env.listeners.get('visibilitychange')()
  assert.equal(word.dataset.effect, undefined)
  env.advance(60000)
  assert.equal(word.dataset.effect, undefined)
  document.hidden = false
  env.listeners.get('visibilitychange')()
  env.advance(60001)
  assert.equal(word.dataset.effect, undefined)
  stop()
  assert.ok(env.stopped)
})

test('scramble preserves whitespace and original case on both ends', () => {
  mock.method(Math, 'random', () => 0)
  assert.equal(scrambleFrame('Grüße Pascal', 'SYSTEM ALERT', 0), 'Grüße Pascal')
  const mixed = scrambleFrame('Grüße Pascal', 'SYSTEM ALERT', 1000)
  assert.equal(mixed[5], ' ')
  assert.ok(mixed.includes('0'))
  assert.equal(scrambleFrame('Grüße Pascal', 'SYSTEM ALERT', SCRAMBLE_DURATION), 'Grüße Pascal')
})
