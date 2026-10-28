import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

let dom, server, React, createRoot, RouterProvider, createPortfolioRouter, module
let reduced = true
const errors = []
const anchorScrolls = []
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const until = async (predicate, message, timeout = 8000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) { if (predicate()) return; await wait(10) }
  throw new Error(`Timed out: ${message}`)
}

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://portfolio.test/', pretendToBeVisual: true })
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'MutationObserver']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
  }
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  globalThis.getComputedStyle = window.getComputedStyle.bind(window)
  window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} })
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() } })
  Object.defineProperty(document.documentElement, 'clientWidth', { value: window.innerWidth })
  let x = 0, y = 0
  Object.defineProperty(window, 'scrollX', { get: () => x })
  Object.defineProperty(window, 'scrollY', { get: () => y })
  window.scrollTo = (left, top) => { x = typeof left === 'object' ? left.left ?? x : left; y = typeof left === 'object' ? left.top ?? y : top }
  window.HTMLElement.prototype.scrollIntoView = function () { anchorScrolls.push(this.id); window.scrollTo(0, 999) }
  window.HTMLCanvasElement.prototype.getContext = () => ({
    setTransform() {}, clearRect() {}, fillText() {}, fillRect() {},
  })
  globalThis.ResizeObserver = class { observe() {} disconnect() {} }
  window.addEventListener('error', (event) => errors.push(event.error ?? event.message))
  React = await import('react')
  ;({ createRoot } = await import('react-dom/client'))
  ;({ RouterProvider } = await import('react-router'))
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  module = await server.ssrLoadModule('/src/router.tsx')
  createPortfolioRouter = module.createPortfolioRouter
})

after(async () => {
  const { gsap } = await import('gsap')
  gsap.ticker.sleep()
  await server?.close()
  dom?.window.close()
})

async function mount() {
  window.history.replaceState(null, '', '/')
  window.scrollTo(0, 0)
  document.body.innerHTML = '<div id="root"></div>'
  const { router, engine } = createPortfolioRouter()
  const root = createRoot(document.getElementById('root'))
  root.render(React.createElement(React.StrictMode, null, React.createElement(RouterProvider, { router })))
  await until(() => document.querySelector('a[href="/it"]'), 'home mounted')
  await wait(60)
  return { router, engine, cleanup: async () => { root.unmount(); router.dispose(); await wait(30) } }
}
async function settled(app, path) {
  await until(() => app.router.state.location.pathname === path && app.engine.getSnapshot().phase === 'idle', path)
  await wait(100)
  assert.equal(document.querySelector('[data-transition-overlay]').dataset.active, undefined)
  assert.equal(document.body.style.overflow, '')
  assert.equal(document.querySelector('[data-transition-content]').hasAttribute('inert'), false)
}

function click(href) {
  const link = document.querySelector(`a[href="${href}"]`)
  assert.ok(link, `link to ${href} exists`)
  link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
}

test('the white homepage uses the supplied portrait/logo and filters the central project list', async () => {
  reduced = true
  const app = await mount()
  try {
    assert.equal(document.querySelector('h1').textContent, 'Pascals Portfolio')
    assert.equal(document.body.style.backgroundColor, 'rgb(255, 255, 255)')
    assert.equal(document.querySelector('img[alt="Logo PP"]').getAttribute('src'), '/images/LogoPP.png')
    assert.equal(document.querySelector('[data-depth-portrait] img').getAttribute('src'), '/images/Dudi.png')
    assert.ok(document.querySelector('[data-depth-portrait] img').style.maskImage.includes('alphamaske.png'))
    const headings = () => document.querySelectorAll('#projekte h3')
    const pressFilter = (label) => Array.from(document.querySelectorAll('#projekte button')).find((button) => button.textContent === label).click()
    assert.equal(headings().length, 5)
    pressFilter('IT')
    await until(() => headings().length === 2, 'IT project filter')
    assert.ok(document.querySelector('#projekte a[href="/it/mouseglow"]'))
    pressFilter('Fotografie')
    await until(() => headings().length === 1, 'photography filter')
    assert.equal(headings()[0].textContent, 'Fotoprojekt')
    pressFilter('Alle')
    await until(() => headings().length === 5, 'all projects restored')
    assert.equal(document.querySelector('[data-terminal-word]'), null)
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
  assert.equal(document.body.style.backgroundColor, '')
})

test('real Links, native Back/Forward and scroll/focus restoration use the same state machine', async () => {
  reduced = true
  const app = await mount()
  try {
    const commits = []
    const unsubscribe = app.router.subscribe((state) => {
      if (state.location.pathname === '/it') commits.push(document.querySelector('[data-transition-backdrop]').style.opacity)
    })
    window.scrollTo(0, 123)
    click('/it')
    await until(() => app.engine.busy, 'transition starts')
    assert.equal(app.router.state.location.pathname, '/')
    await settled(app, '/it')
    assert.equal(window.scrollY, 0)
    assert.equal(document.activeElement.tagName, 'H1')
    assert.ok(commits.length && commits.every((opacity) => opacity === '1'))
    assert.equal(app.engine.getSnapshot().direction, 'enter')
    window.scrollTo(0, 450)
    window.history.back()
    await settled(app, '/')
    assert.equal(app.engine.getSnapshot().direction, 'leave')
    assert.equal(window.scrollY, 123)
    window.history.forward()
    await settled(app, '/it')
    assert.equal(window.scrollY, 450)
    assert.equal(app.engine.getSnapshot().direction, 'enter')
    click('/it#projekte')
    await until(() => app.router.state.location.hash === '#projekte', 'hash navigation')
    await until(() => anchorScrolls.at(-1) === 'projekte', 'anchor restored after React commit')
    assert.equal(app.engine.busy, false)
    assert.equal(anchorScrolls.at(-1), 'projekte')
    window.history.back()
    await until(() => !app.router.state.location.hash, 'back from hash')
    await wait(50)
    assert.equal(window.scrollY, 450)
    click('/it/mouseglow')
    await settled(app, '/it/mouseglow')
    assert.equal(app.engine.getSnapshot().direction, 'leave')
    assert.ok(document.querySelector('input[type="range"]'))
    unsubscribe()
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
})

test('programmatic navigation drops repeated requests while a transition is running', async () => {
  reduced = true
  const app = await mount()
  try {
    void app.router.navigate('/it')
    void app.router.navigate('/it/mouseglow')
    await until(() => app.engine.busy, 'programmatic transition starts')
    await app.router.navigate('/it/mouseglow')
    await app.router.navigate('/')
    await settled(app, '/it')
    assert.equal(app.router.state.location.pathname, '/it')
    await app.router.navigate('/')
    await settled(app, '/')
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
})

test('Escape cancels an uncommitted navigation without losing the source page', async () => {
  reduced = false
  const app = await mount()
  try {
    click('/it')
    await until(() => app.engine.getSnapshot().phase === 'covering', 'covering started')
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settled(app, '/')
    assert.ok(document.querySelector('h1').textContent.includes('Pascal'))
    assert.equal(document.querySelector('[data-transition-overlay] canvas'), null)
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
})

test('the actual GSAP/Canvas IT module enters, leaves and removes all effect DOM/styles', async () => {
  reduced = false
  const app = await mount()
  try {
    click('/it')
    await until(() => document.querySelector('[data-transition-overlay] canvas'), 'Matrix module loaded')
    assert.ok(document.querySelector('[data-transition-overlay]').textContent.includes('CONNECTING_'))
    await until(() => app.engine.getSnapshot().phase === 'revealing', 'destination is revealing')
    window.history.back()
    await settled(app, '/it')
    assert.equal(document.querySelector('[data-transition-overlay] canvas'), null)
    assert.equal(app.engine.getSnapshot().error, null)
    click('/')
    await until(() => document.querySelector('[data-transition-overlay] canvas'), 'leave Matrix mounted')
    assert.ok(document.querySelector('[data-transition-overlay]').textContent.includes('DISCONNECTING_'))
    await settled(app, '/')
    assert.equal(document.querySelector('[data-transition-overlay] canvas'), null)
    assert.equal(document.querySelector('[data-transition-content]').style.getPropertyValue('--it-glitch-strength'), '')
    assert.equal(app.engine.getSnapshot().error, null)
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
})

test('the isolated demo supports Enter, Leave, Reset and useNavigate', async () => {
  reduced = true
  const app = await mount()
  try {
    await app.router.navigate('/transitions')
    await settled(app, '/transitions')
    const button = (text) => Array.from(document.querySelectorAll('button')).find((element) => element.textContent === text)
    const press = (text) => { const element = button(text); assert.ok(element); element.click() }
    reduced = false
    press('IT Enter')
    await until(() => document.querySelector('main canvas'), 'demo canvas mounted')
    press('Reset')
    await until(() => !document.querySelector('main canvas'), 'demo reset disposes canvas')
    press('IT Leave')
    await until(() => document.querySelector('main canvas'), 'demo leave mounted')
    await until(() => !document.querySelector('main canvas'), 'demo leave finished')
    assert.ok(document.querySelector('main [role="status"]').textContent.includes('idle'))
    assert.equal(document.querySelectorAll('aside input[type="range"]').length, 6)
    reduced = true
    press('IT per useNavigate')
    await settled(app, '/it')
    assert.deepEqual(errors, [])
  } finally { await app.cleanup() }
})
