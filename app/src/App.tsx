import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { KlubProvider } from './KlubContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Members from './pages/Members'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'

function AppShell() {
  return (
    <KlubProvider>
      <div className="mkw">
        <Sidebar />
        <main className="mkw-main">
          <Outlet />
        </main>
      </div>
    </KlubProvider>
  )
}

function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/login" replace />

  // Redirect mobile users to the PWA
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  if (isMobile) {
    window.location.replace('https://app.makersklub.com')
    return null
  }

  return <AppShell />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup/*" element={<Signup />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/home"    element={<Dashboard />} />
          <Route path="/events"  element={<Events />} />
          <Route path="/network" element={<Members />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
