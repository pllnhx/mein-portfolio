export const WORD_INTERVAL = [3000, 10000] as const
export const WORD_GLITCH_DURATION = [500, 1500] as const
export const SCRAMBLE_INTERVAL = [8000, 15000] as const
export const TITLE_INTERVAL = [1000, 4000] as const
export const SCREEN_INTERVAL = [15000, 40000] as const
export const TITLE_GLITCH_DURATION = 180
export const MAX_ACTIVE_WORDS = 3
export const COLOR_PROBABILITY = 0.4
const scramblePhases = [
  ['tint', 600],
  ['corrupt', 800],
  ['resolve', 1500],
  ['hold', 900],
  ['dissolve', 800],
  ['restore', 1500],
  ['untint', 600],
] as const

export const SCRAMBLE_DURATION = scramblePhases.reduce((total, [, duration]) => total + duration, 0)

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function chooseTone() {
  return Math.random() < COLOR_PROBABILITY ? 'color' : 'mono'
}

export function scramblePhase(elapsed: number) {
  let offset = 0
  for (const [phase, duration] of scramblePhases) {
    if (elapsed < offset + duration) return { phase, progress: Math.max(0, (elapsed - offset) / duration) }
    offset += duration
  }
  return { phase: 'untint' as const, progress: 1 }
}

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/<>_:'
const randomCharacter = () => alphabet[Math.floor(Math.random() * alphabet.length)]

export function scrambleFrame(original: string, message: string, elapsed: number) {
  if (textCharacters(original).length !== textCharacters(message).length) {
    throw new RangeError('Scramble text must have exactly the original character count')
  }
  const { phase, progress } = scramblePhase(elapsed)
  if (phase === 'tint' || phase === 'untint') return original
  if (phase === 'hold') return message

  const corrupting = phase === 'corrupt' || phase === 'dissolve'
  const target = phase === 'corrupt' || phase === 'restore' ? original : message
  const characters = textCharacters(target)
  const boundary = Math.floor(progress * characters.length)
  return characters.map((character, index) => {
    if (/\s/.test(character)) return character
    const randomize = corrupting ? index < boundary : index >= boundary
    return randomize ? randomCharacter() : character
  }).join('')
}
import { textCharacters } from '../../../components/effects/TerminalText/textCharacters.ts'

