import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { getSupabaseClient, acceptConnection, declineConnection, type Event, type Profile, type Connection, AVATAR_COLORS } from './supabase'

type KlubContextType = {
  connections: Connection[]           // accepted only (both directions)
  incomingRequests: Connection[]      // pending incoming — shown as Accept/Deny
  events: Event[]
  rsvpd: Set<string>
  allRsvps: { clerk_user_id: string; event_id: string; created_at: string; profile?: Profile }[]
  allProfiles: Profile[]
  loading: boolean
  isOnboarding: boolean
  toggleRsvp: (event: Event) => Promise<void>
  updateConnection: (id: string, patch: Partial<Connection>) => void
  saveConnection: (conn: Connection) => Promise<void>
  clearTag: (conn: Connection, tag: string) => Promise<void>
  addConnection: (conn: Connection) => void
  acceptRequest: (conn: Connection) => Promise<void>
  declineRequest: (conn: Connection) => Promise<void>
  refresh: () => Promise<void>
}

const KlubContext = createContext<KlubContextType | null>(null)

export function KlubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { session } = useSession()
  const [connections, setConnections] = useState<Connection[]>([])
  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set())
  const [allRsvps, setAllRsvps] = useState<{ clerk_user_id: string; event_id: string; created_at: string; profile?: Profile }[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !session) { setLoading(false); return }

    const token = await session.getToken()
    const db = getSupabaseClient(token)

    // Ensure a profile row exists for this user
    const { data: existingProfile } = await db
      .from('profiles')
      .select('clerk_user_id')
      .eq('clerk_user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || ''
      const slug = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + user.id.slice(-6)
      await db.from('profiles').insert({
        clerk_user_id: user.id,
        full_name: fullName,
        bio: '',
        role_category: '',
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        slug,
        linkedin_url: '',
        instagram_url: '',
        website_url: '',
        notify_email: true,
      })
    }

    const [
      { data: outgoingData },
      { data: incomingData },
      { data: eventsData },
      { data: rsvpData },
      { data: allRsvpData },
      { data: profilesAllData },
    ] = await Promise.all([
      // Outgoing: rows where this user is the scanner, not declined
      db.from('connections').select('*').eq('clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
      // Incoming: rows where this user is the target, not declined
      db.from('connections').select('*').eq('connected_clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
      db.from('events').select('*').order('date'),
      db.from('event_rsvps').select('event_id').eq('clerk_user_id', user.id),
      db.from('event_rsvps').select('clerk_user_id, event_id, created_at').order('created_at', { ascending: false }),
      db.from('profiles').select('*').neq('clerk_user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    if (eventsData) setEvents(eventsData)
    if (rsvpData) setRsvpd(new Set(rsvpData.map((r: { event_id: string }) => r.event_id)))
    if (profilesAllData) setAllProfiles(profilesAllData as Profile[])
    if (allRsvpData && profilesAllData) {
      const profileMap = new Map((profilesAllData as Profile[]).map(p => [p.clerk_user_id, p]))
      setAllRsvps(allRsvpData.map((r: any) => ({ ...r, profile: profileMap.get(r.clerk_user_id) })))
    }

    // Build a combined profile map for both directions
    const allConnRows = [...(outgoingData || []), ...(incomingData || [])]
    const otherIds = allConnRows.map((c: any) =>
      outgoingData?.includes(c) ? c.connected_clerk_user_id : c.clerk_user_id
    )
    const uniqueIds = [...new Set(otherIds)]
    let profileMap = new Map<string, Profile>()
    if (uniqueIds.length > 0) {
      const { data: profilesData } = await db.from('profiles').select('*').in('clerk_user_id', uniqueIds)
      profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
    }

    const outgoingRows: Connection[] = (outgoingData || []).map((c: any) => ({
      ...c,
      action_tags: c.action_tags || [],
      remind_followup: c.remind_followup || false,
      status: c.status || 'accepted',
      direction: 'outgoing' as const,
      profile: profileMap.get(c.connected_clerk_user_id),
    }))

    const incomingRows: Connection[] = (incomingData || []).map((c: any) => ({
      ...c,
      action_tags: c.action_tags || [],
      remind_followup: c.remind_followup || false,
      status: c.status || 'accepted',
      direction: 'incoming' as const,
      profile: profileMap.get(c.clerk_user_id),
    }))

    // Accepted connections from both directions
    const accepted = [
      ...outgoingRows.filter(c => c.status === 'accepted'),
      ...incomingRows.filter(c => c.status === 'accepted'),
    ]
    // Incoming pending only — these need Accept/Deny
    const pendingIncoming = incomingRows.filter(c => c.status === 'pending')

    setConnections(accepted)
    setIncomingRequests(pendingIncoming)
    setLoading(false)
  }, [user, session])

  useEffect(() => {
    if (user && session) load()
  }, [user, session, load])

  async function toggleRsvp(event: Event) {
    if (event.luma_url) { window.open(event.luma_url, '_blank'); return }
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const going = rsvpd.has(event.id)
    if (going) {
      await db.from('event_rsvps').delete().eq('clerk_user_id', user?.id).eq('event_id', event.id)
      setRsvpd(prev => { const s = new Set(prev); s.delete(event.id); return s })
    } else {
      await db.from('event_rsvps').insert({ clerk_user_id: user?.id, event_id: event.id, status: 'going' })
      setRsvpd(prev => new Set([...prev, event.id]))
    }
  }

  function updateConnection(id: string, patch: Partial<Connection>) {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  async function saveConnection(conn: Connection) {
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    await db.from('connections').update({
      notes: conn.notes,
      action_tags: conn.action_tags,
      remind_followup: conn.remind_followup
    }).eq('id', conn.id)
  }

  async function clearTag(conn: Connection, tag: string) {
    const tags = conn.action_tags.filter(t => t !== tag)
    updateConnection(conn.id, { action_tags: tags })
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    await db.from('connections').update({ action_tags: tags }).eq('id', conn.id)
  }

  function addConnection(conn: Connection) {
    setConnections(prev => [conn, ...prev])
  }

  async function acceptRequest(conn: Connection) {
    const token = await session?.getToken()
    const ok = await acceptConnection(conn.id, token)
    if (!ok) return
    // Move from incomingRequests → connections
    setIncomingRequests(prev => prev.filter(c => c.id !== conn.id))
    setConnections(prev => [{ ...conn, status: 'accepted' }, ...prev])
  }

  async function declineRequest(conn: Connection) {
    const token = await session?.getToken()
    const ok = await declineConnection(conn.id, token)
    if (!ok) return
    setIncomingRequests(prev => prev.filter(c => c.id !== conn.id))
  }

  return (
    <KlubContext.Provider value={{
      connections, incomingRequests, events, rsvpd, allRsvps, allProfiles, loading,
      isOnboarding: connections.length === 0 && events.filter(e => new Date(e.date) < new Date()).length === 0,
      toggleRsvp, updateConnection, saveConnection, clearTag, addConnection,
      acceptRequest, declineRequest,
      refresh: load,
    }}>
      {children}
    </KlubContext.Provider>
  )
}

export function useKlub() {
  const ctx = useContext(KlubContext)
  if (!ctx) throw new Error('useKlub must be used within KlubProvider')
  return ctx
}
