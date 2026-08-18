import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/projects.css'
import './styles/responsive.css'
import './styles/studio.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
