import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Members from './pages/Members'
import Profile from './pages/Profile'
import Login from './pages/Login'

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkw">
      <Sidebar />
      <main className="mkw-main">{children}</main>
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn><AppShell>{children}</AppShell></SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app/login/*"    element={<Login />} />
        <Route path="/app/dashboard"  element={<Protected><Dashboard /></Protected>} />
        <Route path="/app/events"     element={<Protected><Events /></Protected>} />
        <Route path="/app/network"    element={<Protected><Members /></Protected>} />
        <Route path="/app/members"    element={<Protected><Members /></Protected>} />
        <Route path="/app/profile"    element={<Protected><Profile /></Protected>} />
        <Route path="/app/index.html" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/app"            element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/"               element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
