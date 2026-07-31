import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { KlubProvider, useKlub } from './KlubContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Members from './pages/Members'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Admin from './pages/Admin'
import OnboardingWizard from './pages/OnboardingWizard'

/**
 * New signups get a bare profile stub with onboarding_complete = false
 * (inserted by KlubContext's load()) and are redirected here until they
 * finish the wizard. While data is still loading, renders nothing to
 * avoid a flash redirect.
 */
function OnboardingGate({ children }: { children: ReactNode }) {
  const { profile, loading } = useKlub()
  if (loading) return null
  if (!profile || !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function AppShell() {
  return (
    <div className="mkw">
      <Sidebar />
      <main className="mkw-main">
        <OnboardingGate>
          <Outlet />
        </OnboardingGate>
      </main>
    </div>
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

  return (
    <KlubProvider>
      <Outlet />
    </KlubProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/signup/*" element={<Signup />} />
        <Route element={<ProtectedLayout />}>
          {/* Onboarding — protected, no gate (it IS the gate destination) */}
          <Route path="/onboarding" element={<OnboardingWizard />} />

          <Route element={<AppShell />}>
            <Route path="/home"    element={<Dashboard />} />
            <Route path="/events"  element={<Events />} />
            <Route path="/network" element={<Members />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin"   element={<Admin />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
