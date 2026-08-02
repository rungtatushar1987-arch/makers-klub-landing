import { getInitials, type Profile } from '../supabase'
import '../pages/Onboarding.css'

export function CommunityStatsCard({ totalMembers, eventsRun }: { totalMembers: number; eventsRun: number }) {
  return (
    <div className="onb-card onb-card-community">
      <div className="onb-card-label">The community</div>
      <div className="onb-community-stats">
        <div className="onb-comm-stat">
          <div className="onb-comm-num">{totalMembers}</div>
          <div className="onb-comm-lbl">Members</div>
        </div>
        <div className="onb-comm-stat">
          <div className="onb-comm-num">{eventsRun}</div>
          <div className="onb-comm-lbl">Events run</div>
        </div>
        <div className="onb-comm-stat">
          <div className="onb-comm-num">Berlin</div>
          <div className="onb-comm-lbl">Based in</div>
        </div>
      </div>
      <p className="onb-community-note">
        Designers, art directors, founders, motion directors, copywriters — all in the same room.
      </p>
    </div>
  )
}

export function RecommendedPeopleCard({ members }: { members: Profile[] }) {
  if (members.length === 0) return null
  return (
    <div className="onb-card">
      <div className="onb-card-label">People</div>
      <div className="onb-card-title" style={{ marginBottom: 12 }}>Recommended people</div>
      <div className="onb-member-strip onb-member-strip--col">
        {members.map(m => (
          <div key={m.clerk_user_id} className="onb-member-chip">
            <div className="onb-member-av" style={{ background: m.avatar_color || '#0f1e3d' }}>
              {getInitials(m.full_name)}
            </div>
            <div className="onb-member-info">
              <span className="onb-member-name">{m.full_name?.split(' ')[0] || '?'}</span>
              {m.role_category && <span className="onb-member-role">{m.role_category}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
