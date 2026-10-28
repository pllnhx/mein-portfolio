import {
  chooseTone, MAX_ACTIVE_WORDS, randomBetween, SCRAMBLE_DURATION,
  scrambleFrame, SCRAMBLE_INTERVAL, scramblePhase,
  WORD_GLITCH_DURATION, WORD_INTERVAL,
} from './effectTiming.ts'
import { chooseScrambleTarget } from './scrambleSelection.ts'
import type { ScrambleTarget } from './scrambleSelection.ts'
import { textCharacters } from '../../../components/effects/TerminalText/textCharacters.ts'

type ActiveGlitch = { started: number; duration: number }
type ActiveScramble = { target: ScrambleTarget; started: number }

/** Page-wide clocks, independent of the number of rendered words. */
export function startWordEffects(root: HTMLElement) {
  const words = new Set<HTMLElement>()
  const glitches = new Map<HTMLElement, ActiveGlitch>()
  let scramble: ActiveScramble | null = null
  let dirty = true
  let nextGlitchAt = performance.now() + randomBetween(...WORD_INTERVAL)
  let nextScrambleAt = performance.now() + randomBetween(...SCRAMBLE_INTERVAL)
  const observer = new MutationObserver(() => { dirty = true })
  observer.observe(root, { childList: true, subtree: true, characterData: true })

  const clearGlitch = (word: HTMLElement) => {
    delete word.dataset.effect
    delete word.dataset.tone
    word.style.removeProperty('--word-glitch-duration')
    glitches.delete(word)
  }

  const clearScramble = () => {
    if (!scramble) return
    for (const character of scramble.target.characters) {
      delete character.dataset.scramblePhase
      const overlay = character.querySelector<HTMLElement>('[data-terminal-character-overlay]')
      if (overlay) {
        delete overlay.dataset.scramble
        const glyph = overlay.querySelector('[data-terminal-glyph]')
        if (glyph) glyph.textContent = ''
      }
    }
    for (const word of scramble.target.words) delete word.dataset.scrambleActive
    scramble = null
  }

  const updateScramble = (now: number) => {
    if (!scramble) return
    const { target, started } = scramble
    const elapsed = now - started
    const phase = scramblePhase(elapsed).phase
    const frame = textCharacters(scrambleFrame(target.original, target.message, elapsed))
    target.characters.forEach((character, index) => {
      if (character.dataset.scramblePhase !== phase) character.dataset.scramblePhase = phase
      const overlay = character.querySelector<HTMLElement>('[data-terminal-character-overlay]')
      if (overlay) {
        overlay.dataset.scramble = frame[index]
        const glyph = overlay.querySelector('[data-terminal-glyph]')
        if (glyph) glyph.textContent = frame[index]
      }
    })
  }

  const candidates = () => Array.from(words).filter((word) => {
    if (glitches.has(word) || scramble?.target.words.includes(word) || word.closest('[data-title-effects]')) return false
    const rect = word.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
  })

  const reset = () => {
    words.forEach(clearGlitch)
    clearScramble()
    const now = performance.now()
    nextGlitchAt = now + randomBetween(...WORD_INTERVAL)
    nextScrambleAt = now + randomBetween(...SCRAMBLE_INTERVAL)
  }

  const tick = () => {
    if (document.hidden) return
    const now = performance.now()
    if (dirty) {
      words.forEach((word) => {
        if (!root.contains(word)) { clearGlitch(word); words.delete(word) }
      })
      if (scramble && scramble.target.characters.some((character) => !root.contains(character))) clearScramble()
      root.querySelectorAll<HTMLElement>('[data-terminal-word]').forEach((word) => words.add(word))
      dirty = false
    }

    glitches.forEach((effect, word) => {
      if (now - effect.started >= effect.duration) clearGlitch(word)
    })
    if (scramble) {
      if (now - scramble.started >= SCRAMBLE_DURATION) clearScramble()
      else updateScramble(now)
    }

    // Select 4–20 characters first, then a visible range of exactly that length.
    if (now >= nextScrambleAt && !scramble && glitches.size < MAX_ACTIVE_WORDS) {
      const target = chooseScrambleTarget(root, new Set(glitches.keys()), MAX_ACTIVE_WORDS - glitches.size)
      if (target) {
        scramble = { target, started: now }
        for (const word of target.words) word.dataset.scrambleActive = 'true'
        updateScramble(now)
        nextScrambleAt = now + randomBetween(...SCRAMBLE_INTERVAL)
      }
    }

    if (now >= nextGlitchAt) {
      const pool = candidates()
      // Reserve room for a scramble that will start during this glitch batch.
      const reserve = nextScrambleAt - now <= WORD_GLITCH_DURATION[1] ? 1 : 0
      const activeWords = glitches.size + (scramble?.target.words.length ?? 0)
      const slots = Math.min(MAX_ACTIVE_WORDS - activeWords - reserve, pool.length)
      if (slots > 0) {
        const count = 1 + Math.floor(Math.random() * slots)
        for (let index = 0; index < count; index++) {
          const word = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
          const duration = randomBetween(...WORD_GLITCH_DURATION)
          glitches.set(word, { started: now, duration })
          word.style.setProperty('--word-glitch-duration', `${duration}ms`)
          word.dataset.effect = 'glitch'
          word.dataset.tone = chooseTone()
        }
      }
      nextGlitchAt = now + randomBetween(...WORD_INTERVAL)
    }
  }

  const timer = window.setInterval(tick, 80)
  document.addEventListener('visibilitychange', reset)
  tick()
  return () => {
    window.clearInterval(timer)
    observer.disconnect()
    document.removeEventListener('visibilitychange', reset)
    clearScramble()
    words.forEach(clearGlitch)
    words.clear()
  }
}
