import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SleepDataProviderComponent } from './providers/SleepDataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SleepDataProviderComponent>
      <App />
    </SleepDataProviderComponent>
  </StrictMode>,
)
