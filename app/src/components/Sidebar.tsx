import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getInitials, MK_ADMIN_USER_IDS } from '../supabase'
import { useEffect, useState } from 'react'

// Stroke icons, 18px, inherit colour from .nav-ic so active/hover states keep working.
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ICONS = {
  home:      <Svg><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>,
  events:    <Svg><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>,
  network:   <Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6" /></Svg>,
  resources: <Svg><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M4 19a2 2 0 012-2h13" /></Svg>,
  profile:   <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Svg>,
  community: <Svg><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>,
}

export default function Sidebar() {
  const { user } = useUser()
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
    setIsAdmin(!!user?.id && MK_ADMIN_USER_IDS.includes(user.id))
  }, [user])

  return (
    <aside className="mkw-side">
      {/* Brand + greeting */}
      <div className="mkw-brand">
        <div className="mkw-brand-logo">
          <img src="logo.svg" alt="Makers Klub" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="mkw-brand-name">Makers Klub</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mkw-nav">
        <div className="mkw-nav-label">Klub</div>

        <NavLink to="/home" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-ic">{ICONS.home}</span> Home
        </NavLink>

        {!isOnboarding && (
          <>
            <NavLink to="/events" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">{ICONS.events}</span> Events
            </NavLink>
            <NavLink to="/network" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">{ICONS.network}</span> Network
            </NavLink>
            <NavLink to="/resources" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-ic">{ICONS.resources}</span> Resources
            </NavLink>
          </>
        )}

        <div className="mkw-nav-label" style={{ marginTop: 14 }}>Account</div>

        <NavLink to="/profile" className={({ isActive }) => `mkw-nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-ic">{ICONS.profile}</span> Profile
        </NavLink>

        {isAdmin && (
          <>
            <div className="mkw-nav-label" style={{ marginTop: 14 }}>Organiser</div>
            {([
              { tab: 'members',         icon: ICONS.network,   label: 'Members'     },
              { tab: 'events',          icon: ICONS.events,    label: 'Events'      },
              { tab: 'community',       icon: ICONS.community, label: 'Community'   },
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
