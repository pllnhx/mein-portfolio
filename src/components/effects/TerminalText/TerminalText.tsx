import { Children, cloneElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { textCharacters } from './textCharacters'
import styles from './TerminalText.module.css'

type TextElementProps = { children?: ReactNode; 'aria-hidden'?: boolean | 'true' | 'false'; 'data-effects-ignore'?: boolean }

function characters(text: string) {
  return textCharacters(text).map((character, index) => (
    <span key={index} className={styles.character} data-terminal-character={character}>
      <span className={styles.characterOverlay} data-terminal-character-overlay aria-hidden="true">
        <svg className={styles.glyphCanvas} width="1em" height="1em" overflow="visible" focusable="false">
          <text className={styles.glyph} x="0" y="0" data-terminal-glyph />
        </svg>
      </span>
      <span className={styles.characterSource}>{character}</span>
    </span>
  ))
}

function textRuns(text: string) {
  // Hard line breaks and tabs stay outside selectable ranges; regular spaces count.
  return text.split(/([\r\n\t]+)/u).map((part, partIndex) => (
    /[\p{L}\p{N}]/u.test(part) ? (
      <span key={partIndex} className={styles.run} data-terminal-run>
        {part.split(/(\s+)/u).map((word, index) => (
          /[\p{L}\p{N}]/u.test(word)
            ? <span key={index} className={styles.word} data-terminal-word={word}><span className={styles.source}>{characters(word)}</span><span className={styles.overlay} data-terminal-overlay={word} aria-hidden="true" /></span>
            : <span key={index}>{characters(word)}</span>
        ))}
      </span>
    ) : part
  ))
}

/** Decorate native text without changing its content, semantics or whitespace. */
function decorate(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      const text = String(child)
      if (!/[\p{L}\p{N}]/u.test(text)) return child

      return textRuns(text)
    }

    if (!isValidElement<TextElementProps>(child)) return child
    // Clone supplied children (also Link children) without calling components or
    // decorating an already opted-in subtree for a second time.
    if (child.type === TerminalText || child.props.children == null || child.props['aria-hidden'] === true || child.props['aria-hidden'] === 'true' || child.props['data-effects-ignore']) return child
    return cloneElement(child as ReactElement<TextElementProps>, {}, decorate(child.props.children))
  })
}

export function TerminalText({ children }: { children: ReactNode }) {
  return <>{decorate(children)}</>
}
