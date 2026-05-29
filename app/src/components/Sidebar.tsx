import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'

export default function Sidebar() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const { isOnboarding } = useKlub()

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const role = 'Member · Berlin'

  return (
    <aside className="mkw-side">
      <div className="mkw-brand">
        <img src="/logo.svg" alt="Makers Klub" className="mkw-brand-logo" />
        <div className="mkw-brand-name">Makers Klub</div>
      </div>

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
              <span className="nav-ic">▭</span> Events
            </NavLink>

            <NavLink
              to="/network"
              className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-ic">♡</span> Network
            </NavLink>

            <div className="mkw-nav-label" style={{ marginTop: 14 }}>Account</div>

            <NavLink
              to="/profile"
              className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-ic">◉</span> My Profile
            </NavLink>
          </>
        )}
      </nav>

      <div className="mkw-side-foot">
        <div className="av" style={{ background: '#f4a833', color: '#0f1e3d' }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName || user?.firstName || 'Member'}
          </div>
          <div className="sub">{role}</div>
        </div>
        <button onClick={() => signOut(() => navigate('/login'))}>Sign out</button>
      </div>
    </aside>
  )
}
