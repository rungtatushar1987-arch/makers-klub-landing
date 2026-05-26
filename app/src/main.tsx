import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './tokens.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk publishable key')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/login"
      signUpUrl="/signup"
      tokenCache={{
        getToken: (key: string) => Promise.resolve(localStorage.getItem(key)),
        saveToken: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve() },
        clearToken: (key: string) => { localStorage.removeItem(key); return Promise.resolve() }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
