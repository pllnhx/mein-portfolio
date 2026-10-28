
import './App.css'
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'

// Unsere einzelnen Seiten
import HomePage from './pages/HomePage/HomePage'
import ITPage from './pages/ITPage/ITPage'
import MouseGlowPage from './pages/MouseGlowPage/MouseGlowPage'

const ArtLayout = lazy(() => import('./pages/ArtPage/ArtLayout'))
const ArtPage = lazy(() => import('./pages/ArtPage/ArtPage'))
const ArtGalleryPage = lazy(() => import('./pages/ArtPage/ArtGalleryPage'))
const MedizinPage = lazy(() => import('./pages/MedizinPage/MedizinPage'))

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/it"
        element={<ITPage />}
      />

      <Route
        path="/it/mouseglow"
        element={<MouseGlowPage />}
      />

      <Route
        path="/medizin"
        element={
          <Suspense fallback={<main role="status" style={{ minHeight: '100vh', background: '#f4f4ec', color: '#1c211b', padding: '48px', fontFamily: 'Arial, sans-serif' }}>Medizin wird geladen …</main>}>
            <MedizinPage />
          </Suspense>
        }
      />

      <Route
        path="/art"
        element={
          <Suspense fallback={<main role="status" style={{ minHeight: '100vh', background: '#f2eee5', color: '#39352e', padding: '48px', fontFamily: 'Georgia, serif' }}>Das Atelier öffnet sich …</main>}>
            <ArtLayout />
          </Suspense>
        }
      >
        <Route index element={<ArtPage />} />
        <Route path=":category" element={<ArtGalleryPage />} />
      </Route>

    </Routes>
  )
}

export default App
