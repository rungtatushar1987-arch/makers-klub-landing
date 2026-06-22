import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser, useSession, useClerk } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getInitials, getSupabaseClient } from '../supabase'
import { useEffect, useState } from 'react'

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'

export default function Sidebar() {
  const { user } = useUser()
  const { session } = useSession()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const { isOnboarding } = useKlub()
  const [isAdmin, setIsAdmin] = useState(false)

  const location = useLocation()
  const [adminSearchParams] = useSearchParams()
  const onAdmin = location.pathname === '/admin'
  const activeTab = onAdmin ? (adminSearchParams.get('tab') || 'members') : null

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
            {([
              { tab: 'members',   icon: '👥', label: 'Members'   },
              { tab: 'events',    icon: '▦',  label: 'Events'    },
              { tab: 'analytics', icon: '◈',  label: 'Analytics' },
            ] as const).map(({ tab, icon, label }) => (
              <Link
                key={tab}
                to={`/admin?tab=${tab}`}
                className={`mkw-nav-item${onAdmin && activeTab === tab ? ' active' : ''}`}
              >
                <span className="nav-ic">{icon}</span> {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer user card + logout */}
      <div className="mkw-side-foot">
        <div className="av">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who">{user?.fullName || user?.firstName || 'Member'}</div>
          <div className="sub">{user?.emailAddresses[0]?.emailAddress}</div>
        </div>
      </div>

      <button
        onClick={() => signOut(() => navigate('/login'))}
        style={{
          margin: '8px 16px 16px',
          width: 'calc(100% - 32px)',
          padding: '9px 0',
          borderRadius: 999,
          border: '1.5px solid var(--hairline-strong)',
          background: 'transparent',
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(224,82,79,0.08)'
          e.currentTarget.style.color = 'var(--danger)'
          e.currentTarget.style.borderColor = 'rgba(224,82,79,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--ink-3)'
          e.currentTarget.style.borderColor = 'var(--hairline-strong)'
        }}
      >
        Sign out
      </button>
    </aside>
  )
}
