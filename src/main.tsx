import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { IS_DEV } from './constants.ts'

createRoot(document.getElementById('root')!).render(
  <>
    {IS_DEV ? (
        <App />
      ) : (
        <>
          <StrictMode>
            <App />
          </StrictMode>
        </>
      )}
  </>
)
