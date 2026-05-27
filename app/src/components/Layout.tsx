import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/clerk-react'
import './Layout.css'

const nav = [
  { to: '/home', label: 'Dashboard', icon: '◇' },
  { to: '/events', label: 'Events', icon: '◈' },
  { to: '/network', label: 'Members', icon: '◉' },
  { to: '/profile', label: 'Profile', icon: '◎' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useUser()

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    if (isMobile || isPWA) {
      window.location.href = 'https://app.makersklub.com'
    }
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="Makers Klub" />
          <span>Makers Klub</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/home'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <UserButton afterSignOutUrl="/login" />
          <div className="sidebar-user">
            <p className="sidebar-name">{user?.firstName} {user?.lastName}</p>
            <p className="sidebar-email">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
