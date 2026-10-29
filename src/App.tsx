
import './App.css'

import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet } from 'react-router'

// ─────────────────────────────────────────
// EXISTING PAGES
// ─────────────────────────────────────────

import HomePage from './pages/HomePage/HomePage'
import ITPage from './pages/ITPage/ITPage'
import MouseGlowPage from './pages/MouseGlowPage/MouseGlowPage'

// Lazy-loaded pages
const ArtLayout = lazy(() => import('./pages/ArtPage/ArtLayout'))
const ArtPage = lazy(() => import('./pages/ArtPage/ArtPage'))
const ArtGalleryPage = lazy(
  () => import('./pages/ArtPage/ArtGalleryPage')
)
const MedizinPage = lazy(
  () => import('./pages/MedizinPage/MedizinPage')
)

// ─────────────────────────────────────────
// TRANSITION SYSTEM
// ─────────────────────────────────────────

import { PageTransitionManager } from './transitions/PageTransitionManager'
import type { TransitionEngine } from './transitions/core/TransitionEngine'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

type AppProps = {
  engine: TransitionEngine
}

// ─────────────────────────────────────────
// SHARED TRANSITION LAYOUT
// ─────────────────────────────────────────

function TransitionLayout({
  engine,
}: AppProps) {
  return (
    <PageTransitionManager engine={engine}>
      <Outlet />
    </PageTransitionManager>
  )
}

// ─────────────────────────────────────────
// APP ROUTES
// ─────────────────────────────────────────

function App({ engine }: AppProps) {
  return (
    <Routes>

      {/* GLOBAL TRANSITION WRAPPER */}
      <Route
        element={<TransitionLayout engine={engine} />}
      >

        {/* HOME PAGE */}
        <Route
          path="/"
          element={<HomePage />}
        />

        {/* IT PAGE */}
        <Route
          path="/it"
          element={<ITPage />}
        />

        {/* IT - MOUSE GLOW */}
        <Route
          path="/it/mouseglow"
          element={<MouseGlowPage />}
        />

        {/* MEDICINE PAGE */}
        <Route
          path="/medizin"
          element={
            <Suspense
              fallback={
                <main
                  role="status"
                  style={{
                    minHeight: '100vh',
                    background: '#f4f4ec',
                    color: '#1c211b',
                    padding: '48px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Medizin wird geladen ...
                </main>
              }
            >
              <MedizinPage />
            </Suspense>
          }
        />

        {/* ART PAGE + NESTED ROUTES */}
        <Route
          path="/art"
          element={
            <Suspense
              fallback={
                <main
                  role="status"
                  style={{
                    minHeight: '100vh',
                    background: '#f2eee5',
                    color: '#39352e',
                    padding: '48px',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  Das Atelier öffnet sich ...
                </main>
              }
            >
              <ArtLayout />
            </Suspense>
          }
        >
          <Route
            index
            element={<ArtPage />}
          />

          <Route
            path=":category"
            element={<ArtGalleryPage />}
          />
        </Route>

      </Route>

    </Routes>
  )
}

export default App
