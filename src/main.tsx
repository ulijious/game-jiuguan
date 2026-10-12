import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/design.css'
import { ToastProvider } from './lib/toast'
import { GameProvider } from './lib/store'

const host = document.getElementById('app-root')
if (!host) throw new Error('缺少 #app-root 挂载点')

createRoot(host).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
