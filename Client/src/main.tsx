import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import { ThemeProvider } from './components/Theme/ThemeProvider'
import { clerkPublishableKey, isClerkConfigured } from './lib/clerk'
import './styles/global.css'

const app = (
  <ThemeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider publishableKey={clerkPublishableKey!}>{app}</ClerkProvider>
    ) : (
      app
    )}
  </React.StrictMode>
)
