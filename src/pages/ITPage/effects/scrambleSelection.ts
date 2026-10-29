import { SCRAMBLE_LENGTHS, SCRAMBLE_MESSAGES_BY_LENGTH } from './scrambleMessages.ts'

export type ScrambleTarget = {
  characters: HTMLElement[]
  words: HTMLElement[]
  original: string
  message: string
}

type Character = { element: HTMLElement; text: string; word: HTMLElement | null; visible: boolean }

export function chooseScrambleTarget(root: HTMLElement, blocked: ReadonlySet<HTMLElement>, maxWords: number): ScrambleTarget | null {
  const runs = Array.from(root.querySelectorAll<HTMLElement>('[data-terminal-run]'), (run) => {
    // Measure each character once; positions and native font sizes stay untouched.
    const characters: Character[] = Array.from(run.querySelectorAll<HTMLElement>('[data-terminal-character]'), (element) => {
      const rect = element.getBoundingClientRect()
      return {
        element,
        text: element.dataset.terminalCharacter ?? '',
        word: element.closest<HTMLElement>('[data-terminal-word]'),
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth,
      }
    })
    return characters
  })
  const lengths = [...SCRAMBLE_LENGTHS]
  while (lengths.length) {
    // Choose a length first. If nothing visible fits, try another unused length.
    const length = lengths.splice(Math.floor(Math.random() * lengths.length), 1)[0]
    const matches: Omit<ScrambleTarget, 'message'>[] = []
    for (const characters of runs) {
      for (let start = 0; start <= characters.length - length; start++) {
        const range = characters.slice(start, start + length)
        if (/\s/u.test(range[0].text) || /\s/u.test(range.at(-1)!.text)) continue
        if (range.some((character) => !character.visible || (character.word && blocked.has(character.word)))) continue
        const words = Array.from(new Set(range.flatMap(({ word }) => word ? [word] : [])))
        if (!words.length || words.length > maxWords) continue
        const original = range.map(({ text }) => text).join('')
        if (!/[\p{L}\p{N}]/u.test(original)) continue
        matches.push({ characters: range.map(({ element }) => element), words, original })
      }
    }
    if (matches.length) {
      const target = matches[Math.floor(Math.random() * matches.length)]
      const messages = SCRAMBLE_MESSAGES_BY_LENGTH[length]
      return { ...target, message: messages[Math.floor(Math.random() * messages.length)] }
    }
  }
  return null
}
