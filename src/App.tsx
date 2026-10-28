import './App.css'
import { Outlet } from 'react-router'
import { PageTransitionManager } from './transitions/PageTransitionManager'
import type { TransitionEngine } from './transitions/core/TransitionEngine'

function App({ engine }: { engine: TransitionEngine }) {
  return <PageTransitionManager engine={engine}><Outlet /></PageTransitionManager>
}

export default App
