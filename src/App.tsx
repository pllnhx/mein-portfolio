
import './App.css'
import { Routes, Route } from 'react-router'

// Unsere einzelnen Seiten
import HomePage from './pages/HomePage/HomePage'
import ITPage from './pages/ITPage/ITPage'
import MouseGlowPage from './pages/MouseGlowPage/MouseGlowPage'

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
    </Routes>
  )
}

export default App
