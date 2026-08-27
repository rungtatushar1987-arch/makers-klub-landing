import { useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { calcProfileProgress } from '../supabase'
import { CommunityStatsCard, RecommendedPeopleCard } from '../components/CommunitySidebarCards'
import './Onboarding.css'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Onboarding() {
  const { user } = useUser()
  const { events, allRsvps, allProfiles, totalMembers, connections, profile } = useKlub()

  const now = new Date()
  const eventsRun = events.filter(e => new Date(e.date) < now).length
  const { pct: profilePct, isComplete: profileComplete } = calcProfileProgress(profile)

  // Community members — up to 8, exclude self
  const communityMembers = useMemo(() => {
    return allProfiles.filter(p => p.clerk_user_id !== user?.id).slice(0, 8)
  }, [allProfiles, user?.id])

  // Activity feed — recent RSVPs for upcoming events, exclude self
  const activityFeed = useMemo(() => {
    const now = Date.now()
    const upcomingIds = new Set(events.filter(e => new Date(e.date).getTime() > now).map(e => e.id))
    const eventMap: Record<string, string> = {}
    events.forEach(e => { eventMap[e.id] = e.title })
    return allRsvps
      .filter(r => r.profile && r.clerk_user_id !== user?.id && upcomingIds.has(r.event_id))
      .slice(0, 5)
      .map(r => ({ profile: r.profile!, eventTitle: eventMap[r.event_id] || 'an event', createdAt: r.created_at }))
  }, [allRsvps, events, user?.id])

  return (
    <div className="onb-wrap">

      <div className="onb-grid">
        <div className="onb-main">

          {/* Profile completion */}
          {!profileComplete && (
            <div className="onb-card onb-card-profile">
              <div className="onb-card-head">
                <div>
                  <div className="onb-card-label">Your profile</div>
                  <div className="onb-card-title">Complete your brief</div>
                </div>
                <div className="onb-pct">{profilePct}%</div>
              </div>
              <div className="onb-progress-bar">
                <div className="onb-progress-fill" style={{ width: `${profilePct}%` }} />
              </div>
              <p className="onb-card-body">
                Add your role, a short bio, and your interests so we can match you with the right people and events.
              </p>
              <a href="/profile" className="mk-btn mk-btn-navy mk-btn-sm">Complete your profile →</a>
            </div>
          )}

          {/* Activity feed */}
          {activityFeed.length > 0 && (
            <div className="onb-card">
              <div className="onb-card-label">Community activity</div>
              <div className="onb-activity-list">
                {activityFeed.map((item, i) => (
                  <div key={i} className="onb-activity-item">
                    <div className="onb-activity-av" style={{ background: item.profile.avatar_color || '#0f1e3d' }}>
                      {getInitials(item.profile.full_name)}
                    </div>
                    <div className="onb-activity-text">
                      <strong>{item.profile.full_name?.split(' ')[0] || 'Someone'}</strong>
                      {' '}is going to{' '}
                      <span className="onb-activity-event">{item.eventTitle}</span>
                    </div>
                    <span className="onb-activity-age">{timeAgo(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right column */}
        <div className="onb-side">

          <CommunityStatsCard totalMembers={totalMembers} eventsRun={eventsRun} />

          {/* Current network */}
          <div className="onb-card">
            <div className="onb-card-label">Your network</div>
            <div className="onb-card-title" style={{ marginBottom: 10 }}>Current network</div>
            {connections.length === 0 ? (
              <>
                <p className="onb-card-body" style={{ marginBottom: 12 }}>
                  No connections yet. Come to an event to start building your network.
                </p>
                <a href="/events" className="mk-btn mk-btn-navy mk-btn-sm">Browse events →</a>
              </>
            ) : (
              <div className="onb-member-strip onb-member-strip--col">
                {connections.slice(0, 6).map(c => (
                  <div key={c.id} className="onb-member-chip">
                    <div className="onb-member-av" style={{ background: c.profile?.avatar_color || '#0f1e3d' }}>
                      {getInitials(c.profile?.full_name)}
                    </div>
                    <div className="onb-member-info">
                      <span className="onb-member-name">{c.profile?.full_name?.split(' ')[0] || 'Member'}</span>
                      {c.profile?.role_category && <span className="onb-member-role">{c.profile.role_category}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <RecommendedPeopleCard members={communityMembers} />

        </div>
      </div>
    </div>
  )
}
