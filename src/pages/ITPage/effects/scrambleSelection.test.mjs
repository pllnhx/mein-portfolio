import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { chooseScrambleTarget } from './scrambleSelection.ts'
import { SCRAMBLE_LENGTHS, SCRAMBLE_MESSAGES_BY_LENGTH } from './scrambleMessages.ts'
import { SCRAMBLE_DURATION, scrambleFrame } from './effectTiming.ts'
import { textCharacters } from '../../../components/effects/TerminalText/textCharacters.ts'
import { textEffectsFixture } from './textEffectsFixture.mjs'

let previousWindow
afterEach(() => {
  mock.restoreAll()
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
  else delete globalThis.window
  previousWindow = undefined
})

function fixture() {
  previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1200, innerHeight: 900 } })
  return textEffectsFixture()
}

function randomSequence(values) {
  mock.method(Math, 'random', () => values.shift() ?? .5)
}

test('all 34 supplied messages have exactly their advertised 4–20 characters, including spaces', () => {
  assert.deepEqual(SCRAMBLE_LENGTHS, Array.from({ length: 17 }, (_, index) => index + 4))
  for (const length of SCRAMBLE_LENGTHS) {
    assert.equal(SCRAMBLE_MESSAGES_BY_LENGTH[length].length, 2)
    for (const message of SCRAMBLE_MESSAGES_BY_LENGTH[length]) {
      assert.equal(textCharacters(message).length, length, message)
    }
  }
})

test('the substring deen inside Ideen can become PING without selecting the I', () => {
  const env = fixture()
  const run = env.run('Ideen')
  randomSequence([0, .999, .999])
  const target = chooseScrambleTarget(env.root, new Set(), 3)
  assert.equal(target.original, 'deen')
  assert.equal(target.message, 'PING')
  assert.equal(target.characters.length, 4)
  assert.deepEqual(target.characters, run.characters.slice(1))
  assert.equal(run.characters.map((character) => character.dataset.terminalCharacter).join(''), 'Ideen')
})

test('a 13-character range can cross word boundaries and counts the spaces', () => {
  const env = fixture()
  env.run('und die Neugier')
  randomSequence([.55, 0, 0])
  const target = chooseScrambleTarget(env.root, new Set(), 3)
  assert.equal(target.original, 'und die Neugi')
  assert.equal(target.message, 'ACCESS DENIED')
  assert.equal(target.characters.length, 13)
  assert.equal(target.words.length, 3)
})

test('a 20-character range uses a 20-character message without resizing or padding it', () => {
  const env = fixture()
  const run = env.run('abcdefghijklmnopqrst')
  randomSequence([.999, 0, .999])
  const target = chooseScrambleTarget(env.root, new Set(), 3)
  assert.equal(target.original, 'abcdefghijklmnopqrst')
  assert.equal(target.message, 'YOU HAVE BEEN HACKED')
  assert.equal(target.characters.length, 20)
  assert.deepEqual(target.characters, run.characters)
})

test('unavailable lengths fall back to a fitting length instead of stretching a word', () => {
  const env = fixture()
  env.run('build.')
  mock.method(Math, 'random', () => .999)
  const target = chooseScrambleTarget(env.root, new Set(), 3)
  assert.ok(target)
  assert.ok(target.characters.length >= 4 && target.characters.length <= 6)
  assert.equal(textCharacters(target.original).length, textCharacters(target.message).length)
  assert.notEqual(target.message, 'PAY NOW')
})

test('hidden text and words already glitching cannot be selected', () => {
  const env = fixture()
  const hidden = env.run('unsichtbarer Text', { top: 1200 })
  const blocked = env.run('schon animierter Text')
  mock.method(Math, 'random', () => .5)
  assert.equal(chooseScrambleTarget(env.root, new Set(blocked.words), 3), null)
  assert.ok(hidden.characters.every((character) => !character.dataset.scramblePhase))
})

test('range selection respects the remaining word budget', () => {
  const env = fixture()
  env.run('und die Neugier')
  mock.method(Math, 'random', () => .5)
  const target = chooseScrambleTarget(env.root, new Set(), 1)
  assert.ok(target)
  assert.equal(target.words.length, 1)
})

test('every scramble phase preserves character count and restores Unicode and original case', () => {
  mock.method(Math, 'random', () => .25)
  for (const length of SCRAMBLE_LENGTHS) {
    for (const message of SCRAMBLE_MESSAGES_BY_LENGTH[length]) {
      for (const elapsed of [0, 600, 1000, 2000, 3000, 4000, 5000, 6200, SCRAMBLE_DURATION]) {
        assert.equal(textCharacters(scrambleFrame('a'.repeat(length), message, elapsed)).length, length)
      }
    }
  }
  const original = 'A👩🏽‍💻e\u0301B'
  assert.equal(textCharacters(original).length, 4)
  assert.equal(scrambleFrame(original, 'PING', SCRAMBLE_DURATION), original)
  assert.throws(() => scrambleFrame('build.', 'PAY NOW', 3000), RangeError)
})
