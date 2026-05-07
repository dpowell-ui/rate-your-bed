import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#A53A22',
          colorBackground: '#F4EEDD',
          colorText: '#1B1F2A',
          colorInputBackground: '#F8F3E3',
          colorInputText: '#1B1F2A',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          borderRadius: '0',
        },
        elements: {
          card: {
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            border: '1px solid #D4CABB',
          },
          headerTitle: {
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '32px',
            fontWeight: 400,
          },
          formButtonPrimary: {
            background: '#1B1F2A',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontSize: '12px',
          },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
