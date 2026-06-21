import { NavLink } from 'react-router-dom'
import { useUser, useSession } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getInitials, getSupabaseClient } from '../supabase'
import { useEffect, useState } from 'react'

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'

export default function Sidebar() {
  const { user } = useUser()
  const { session } = useSession()
  const { isOnboarding } = useKlub()
  const [isAdmin, setIsAdmin] = useState(false)

  const initials = getInitials(user?.fullName || user?.firstName || '')

  useEffect(() => {
    if (!session) return
    session.getToken().then(async token => {
      const db = getSupabaseClient(token)
      const { data } = await db.rpc('jwt_is_org_admin', { org: MK_ORG })
      if (data) setIsAdmin(true)
    })
  }, [session])

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

        <NavLink to="/home" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-ic">◇</span> Home
        </NavLink>

        {!isOnboarding && (
          <>
            <NavLink to="/events" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">▦</span> Events
            </NavLink>
            <NavLink to="/network" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">♡</span> Network
            </NavLink>
          </>
        )}

        <div className="mkw-nav-label" style={{ marginTop: 14 }}>Account</div>

        <NavLink to="/profile" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-ic">◉</span> Profile
        </NavLink>

        {isAdmin && (
          <>
            <div className="mkw-nav-label" style={{ marginTop: 14 }}>Organiser</div>
            <NavLink to="/admin" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">⊞</span> Dashboard
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer user card */}
      <div className="mkw-side-foot">
        <div className="av">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who">{user?.fullName || user?.firstName || 'Member'}</div>
          <div className="sub">{user?.emailAddresses[0]?.emailAddress}</div>
        </div>
      </div>
    </aside>
  )
}
