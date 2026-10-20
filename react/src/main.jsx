import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/designer.css'
import './styles/sources.css'
import './styles/joins.css'
import './styles/fields.css'
import './styles/send.css'
import './styles/progress.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
