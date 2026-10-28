import { textCharacters } from '../../../components/effects/TerminalText/textCharacters.ts'

/** Minimal text DOM for behavior tests; source text and styles remain immutable. */
export function textEffectsFixture() {
  const words = []
  const runs = []
  const visibleRuns = () => runs.filter((run) => run.words.some((word) => words.includes(word)))
  const root = {
    querySelectorAll: (selector) => selector === '[data-terminal-word]' ? words : visibleRuns(),
    contains: (element) => words.includes(element) || visibleRuns().some((run) => run === element || run.characters.includes(element)),
  }

  function run(text, { title = false, top = 100 } = {}) {
    const item = { words: [], characters: [], querySelectorAll() { return this.characters } }
    let index = 0
    for (const token of text.split(/(\s+)/u)) {
      if (!token) continue
      const properties = new Map()
      const left = 80 + index * 10
      const word = /[\p{L}\p{N}]/u.test(token) ? {
        dataset: { terminalWord: token },
        style: { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key) },
        getBoundingClientRect: () => ({ width: textCharacters(token).length * 10, height: 18, left, right: left + textCharacters(token).length * 10, top, bottom: top + 18 }),
        closest: () => title ? {} : null,
        properties,
        characters: [],
      } : null
      if (word) { words.push(word); item.words.push(word) }
      for (const character of textCharacters(token)) {
        const x = 80 + index++ * 10
        const glyph = { textContent: '' }
        const overlay = { dataset: {}, querySelector: () => glyph }
        const element = {
          dataset: { terminalCharacter: character },
          getBoundingClientRect: () => ({ width: 10, height: 18, left: x, right: x + 10, top, bottom: top + 18 }),
          closest: () => word,
          querySelector: () => overlay,
          overlay,
        }
        item.characters.push(element)
        word?.characters.push(element)
      }
    }
    runs.push(item)
    return item
  }
  const selected = () => visibleRuns().flatMap((item) => item.characters).filter((character) => character.dataset.scramblePhase)

  return {
    root, words, runs, run,
    word: (text, options) => run(text, options).words[0],
    get phase() { return selected()[0]?.dataset.scramblePhase },
    get scrambleText() { return selected().map((character) => character.overlay.dataset.scramble).join('') },
    get selectedCharacters() { return selected() },
    count: (kind) => words.filter((word) => kind === 'scramble' ? word.dataset.scrambleActive : kind === 'glitch' ? word.dataset.effect === 'glitch' : word.dataset.scrambleActive || word.dataset.effect).length,
  }
}
