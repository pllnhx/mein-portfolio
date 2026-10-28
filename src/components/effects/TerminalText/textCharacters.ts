const segmenter = new Intl.Segmenter('de', { granularity: 'grapheme' })

/** Count visible characters, including spaces, without splitting umlauts or emoji. */
export function textCharacters(text: string) {
  return Array.from(segmenter.segment(text), ({ segment }) => segment)
}
