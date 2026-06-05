import { NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getInitials } from '../supabase'

export default function Sidebar() {
  const { user } = useUser()
  const { isOnboarding } = useKlub()

  const initials = getInitials(user?.fullName || user?.firstName || '')

  return (
    <aside className="mkw-side">
      {/* Brand */}
      <div className="mkw-brand">
        <div className="mkw-brand-mark">MK</div>
        <div>
          <div className="mkw-brand-name">Makers Klub</div>
          <div className="mkw-brand-sub">Berlin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mkw-nav">
        <div className="mkw-nav-label">Klub</div>

        <NavLink
          to="/home"
          className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-ic">◇</span> Home
        </NavLink>

        {!isOnboarding && (
          <>
            <NavLink
              to="/events"
              className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-ic">▦</span> Events
            </NavLink>

            <NavLink
              to="/network"
              className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-ic">♡</span> Network
            </NavLink>
          </>
        )}

        <div className="mkw-nav-label" style={{ marginTop: 14 }}>Account</div>

        <NavLink
          to="/profile"
          className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-ic">◉</span> Profile
        </NavLink>
      </nav>

      {/* Footer user card */}
      <div className="mkw-side-foot">
        <div className="av">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who">{user?.fullName || user?.firstName || 'Member'}</div>
          <div className="sub">Founding member</div>
        </div>
      </div>
    </aside>
  )
}
