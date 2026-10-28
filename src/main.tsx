import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { createPortfolioRouter } from './router'

const { router } = createPortfolioRouter()
createRoot(document.getElementById('root')!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
)
