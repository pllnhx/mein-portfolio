
import './App.css'
import { Routes, Route } from 'react-router'

// Unsere einzelnen Seiten
import HomePage from './pages/HomePage/HomePage'
import ITPage from './pages/ITPage/ITPage'
import MouseGlowPage from './pages/MouseGlowPage/MouseGlowPage'
import ArtPage from './pages/ArtPage/ArtPage'

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
        path="/art" 
        element={<ARTPage />} 
        />

    </Routes>
  )
}

export default App
