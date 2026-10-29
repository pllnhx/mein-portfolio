import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { focusPage } from '../core/navigationLifecycle.ts'

test('automatic heading focus is quiet and temporary without changing keyboard link focus', () => {
  const dom = new JSDOM('<div id="content"><h1>IT &amp; Vibe Coding<span aria-hidden="true">duplicate glitch text</span></h1><a href="/">Portfolio</a></div>')
  try {
    const document = dom.window.document
    const content = document.getElementById('content')
    const heading = content.querySelector('h1')
    const link = content.querySelector('a')
    assert.equal(focusPage(content), 'IT & Vibe Coding')
    assert.equal(document.activeElement, heading)
    assert.equal(heading.getAttribute('tabindex'), '-1')
    assert.equal(heading.dataset.transitionFocus, 'true')
    assert.equal(link.hasAttribute('data-transition-focus'), false)
    link.focus()
    assert.equal(document.activeElement, link)
    assert.equal(heading.hasAttribute('tabindex'), false)
    assert.equal(heading.hasAttribute('data-transition-focus'), false)
  } finally { dom.window.close() }
})

test('explicit interactive focus targets keep their normal focus indicator and tab order', () => {
  const dom = new JSDOM('<div id="content"><button data-page-focus tabindex="0" style="outline: 2px solid red">Projekte</button></div>')
  try {
    const content = dom.window.document.getElementById('content')
    const button = content.querySelector('button')
    assert.equal(focusPage(content), 'Projekte')
    assert.equal(dom.window.document.activeElement, button)
    assert.equal(button.hasAttribute('data-transition-focus'), false)
    assert.equal(button.style.outline, '2px solid red')
    button.blur()
    assert.equal(button.getAttribute('tabindex'), '0')
  } finally { dom.window.close() }
})

test('a failed focus attempt does not leave temporary attributes behind', () => {
  const dom = new JSDOM('<div id="content"><h1>Portfolio</h1></div>')
  try {
    const content = dom.window.document.getElementById('content')
    const heading = content.querySelector('h1')
    heading.focus = () => {}
    focusPage(content)
    assert.equal(heading.hasAttribute('tabindex'), false)
    assert.equal(heading.hasAttribute('data-transition-focus'), false)
  } finally { dom.window.close() }
})
