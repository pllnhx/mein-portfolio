import { createBrowserRouter, Link } from 'react-router'
import type { RouteObject } from 'react-router'
import App from './App'
import HomePage from './pages/HomePage/HomePage'
import ITPage from './pages/ITPage/ITPage'
import MouseGlowPage from './pages/MouseGlowPage/MouseGlowPage'
import TransitionDemo from './transitions/demo/TransitionDemo'
import { TransitionEngine } from './transitions/core/TransitionEngine'
import { transitionRegistry } from './transitions/registry'
import RouteError from './components/ui/RouteError'

export function portfolioRoutes(engine: TransitionEngine): RouteObject[] {
  return [{ element: <App engine={engine} />, children: [
    { index: true, element: <HomePage />, errorElement: <RouteError /> },
    { path: 'it', element: <ITPage />, errorElement: <RouteError /> },
    { path: 'it/mouseglow', element: <MouseGlowPage />, errorElement: <RouteError /> },
    { path: 'transitions', element: <TransitionDemo />, errorElement: <RouteError /> },
    { path: '*', element: <main style={{ padding: '80px 32px' }}><h1>Seite nicht gefunden</h1><Link to="/">Zur Startseite</Link></main> },
  ] }]
}

export function createPortfolioRouter() {
  const engine = new TransitionEngine(transitionRegistry)
  const router = createBrowserRouter(portfolioRoutes(engine))
  const navigate = router.navigate.bind(router)
  let starting = false
  const release = engine.subscribe(() => { if (engine.busy) starting = false })
  const dispose = router.dispose.bind(router)
  router.dispose = () => { release(); dispose() }
  // Links and useNavigate share this public router method. First request wins.
  router.navigate = (to: number | Parameters<typeof navigate>[0], options?: Parameters<typeof navigate>[1]) => {
    if (engine.busy || starting) return Promise.resolve()
    starting = true
    // Also coalesce synchronous calls before React has mounted the blocker state.
    queueMicrotask(() => { starting = false })
    return typeof to === 'number' ? navigate(to) : navigate(to, options)
  }
  return { router, engine }
}
