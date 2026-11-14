import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { getSupabaseClient, acceptConnection, declineConnection, calcProfileProgress, type Event, type Profile, type Connection, AVATAR_COLORS } from './supabase'

type KlubContextType = {
  connections: Connection[]           // accepted only (both directions)
  incomingRequests: Connection[]      // pending incoming — shown as Accept/Deny
  events: Event[]
  rsvpd: Set<string>                  // events the user is going to (confirmed spot)
  myRsvps: Record<string, RsvpStatus> // event_id -> going | waitlist | interested
  allRsvps: Rsvp[]
  allProfiles: Profile[]
  totalMembers: number
  profile: Profile | null
  loading: boolean
  isOnboarding: boolean
  registerForEvent: (event: Event) => Promise<RsvpStatus | null>
  cancelRegistration: (event: Event) => Promise<boolean>
  updateConnection: (id: string, patch: Partial<Connection>) => void
  saveConnection: (conn: Connection) => Promise<void>
  clearTag: (conn: Connection, tag: string) => Promise<void>
  addConnection: (conn: Connection) => void
  acceptRequest: (conn: Connection) => Promise<void>
  declineRequest: (conn: Connection) => Promise<void>
  refresh: () => Promise<void>
}

export type RsvpStatus = 'going' | 'waitlist' | 'interested'
export type Rsvp = { clerk_user_id: string; event_id: string; status: RsvpStatus; created_at: string; profile?: Profile }

const KlubContext = createContext<KlubContextType | null>(null)

export function KlubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { session } = useSession()
  const [connections, setConnections] = useState<Connection[]>([])
  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [allRsvps, setAllRsvps] = useState<Rsvp[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !session) { setLoading(false); return }

    const token = await session.getToken()
    const db = getSupabaseClient(token)

    // Ensure a profile row exists for this user
    const { data: existingProfile } = await db
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', user.id)
      .maybeSingle()

    let ownProfile = existingProfile as Profile | null

    if (!ownProfile) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || ''
      const slug = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + user.id.slice(-6)
      const { data: inserted } = await db.from('profiles').insert({
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
      }).select().single()
      ownProfile = inserted as Profile | null
    }

    setProfile(ownProfile)

    // Link this member's past Luma attendance to their account (matched server-side on the
    // verified email in the session token). Returns null until that claim is configured.
    try {
      const claimKey = `mk_luma_claim_${user.id}`
      if (!sessionStorage.getItem(claimKey)) {
        const { data: claimed } = await db.rpc('claim_luma_attendance')
        if (claimed !== null && claimed !== undefined) sessionStorage.setItem(claimKey, '1')
      }
    } catch { /* attendance linking is best-effort */ }

    const [
      { data: outgoingData },
      { data: incomingData },
      { data: eventsData },
      { data: allRsvpData },
      { data: profilesAllData },
      { count: profilesCount },
    ] = await Promise.all([
      // Outgoing: rows where this user is the scanner, not declined
      db.from('connections').select('*').eq('clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
      // Incoming: rows where this user is the target, not declined
      db.from('connections').select('*').eq('connected_clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
      db.from('events').select('*').order('date'),
      db.from('event_rsvps').select('clerk_user_id, event_id, status, created_at').order('created_at', { ascending: true }),
      db.from('profiles').select('*').neq('clerk_user_id', user.id).order('created_at', { ascending: false }).limit(20),
      // Exact total row count, uncapped — the real "how many members" number
      db.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    if (eventsData) setEvents(eventsData)
    setTotalMembers(profilesCount ?? 0)
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

  // Lightweight connections-only refresh — used for polling and visibility events
  const refreshConnections = useCallback(async () => {
    if (!user || !session) return
    const token = await session.getToken()
    const db = getSupabaseClient(token)
    const [{ data: outgoingData }, { data: incomingData }] = await Promise.all([
      db.from('connections').select('*').eq('clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
      db.from('connections').select('*').eq('connected_clerk_user_id', user.id).neq('status', 'declined').order('created_at', { ascending: false }),
    ])
    const allRows = [...(outgoingData || []), ...(incomingData || [])]
    const uniqueIds = [...new Set(allRows.map((c: any) =>
      outgoingData?.find((o: any) => o.id === c.id) ? c.connected_clerk_user_id : c.clerk_user_id
    ))]
    let profileMap = new Map<string, Profile>()
    if (uniqueIds.length > 0) {
      const { data: profilesData } = await db.from('profiles').select('*').in('clerk_user_id', uniqueIds)
      profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
    }
    const outgoingRows: Connection[] = (outgoingData || []).map((c: any) => ({
      ...c, action_tags: c.action_tags || [], remind_followup: c.remind_followup || false,
      status: c.status || 'accepted', direction: 'outgoing' as const,
      profile: profileMap.get(c.connected_clerk_user_id),
    }))
    const incomingRows: Connection[] = (incomingData || []).map((c: any) => ({
      ...c, action_tags: c.action_tags || [], remind_followup: c.remind_followup || false,
      status: c.status || 'accepted', direction: 'incoming' as const,
      profile: profileMap.get(c.clerk_user_id),
    }))
    setConnections([
      ...outgoingRows.filter(c => c.status === 'accepted'),
      ...incomingRows.filter(c => c.status === 'accepted'),
    ])
    setIncomingRequests(incomingRows.filter(c => c.status === 'pending'))
  }, [user, session])

  useEffect(() => {
    if (user && session) load()
  }, [user, session, load])

  // Re-fetch connections when tab becomes visible
  useEffect(() => {
    if (!user || !session) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshConnections()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user?.id, session, refreshConnections])

  // Poll connections every 30 s so accepted requests reflect without needing a tab switch
  useEffect(() => {
    if (!user || !session) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshConnections()
    }, 30_000)
    return () => clearInterval(interval)
  }, [user?.id, session, refreshConnections])

  // Capacity and waitlist are decided by a database trigger, so the status is read back from the insert.
  async function registerForEvent(event: Event): Promise<RsvpStatus | null> {
    if (!user) return null
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data, error } = await db
      .from('event_rsvps')
      .insert({ clerk_user_id: user.id, event_id: event.id, status: 'going' })
      .select('clerk_user_id, event_id, status, created_at')
      .single()
    if (error || !data) { console.error('registerForEvent error:', error); return null }
    setAllRsvps(prev => [...prev.filter(r => !(r.clerk_user_id === user.id && r.event_id === event.id)), { ...(data as Rsvp), profile: profile ?? undefined }])
    return (data as Rsvp).status
  }

  async function cancelRegistration(event: Event): Promise<boolean> {
    if (!user) return false
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { error } = await db.from('event_rsvps').delete().eq('clerk_user_id', user.id).eq('event_id', event.id)
    if (error) { console.error('cancelRegistration error:', error); return false }
    await refreshRsvps()
    return true
  }

  // Someone leaving can promote people off the waitlist, so re-read everyone's status.
  const refreshRsvps = useCallback(async () => {
    if (!user || !session) return
    const token = await session.getToken()
    const db = getSupabaseClient(token)
    const { data } = await db.from('event_rsvps').select('clerk_user_id, event_id, status, created_at').order('created_at', { ascending: true })
    if (data) setAllRsvps(data as Rsvp[])
  }, [user, session])

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

  const myRsvps: Record<string, RsvpStatus> = {}
  const rsvpd = new Set<string>()
  for (const r of allRsvps) {
    if (r.clerk_user_id !== user?.id) continue
    myRsvps[r.event_id] = r.status
    if (r.status === 'going') rsvpd.add(r.event_id)
  }

  return (
    <KlubContext.Provider value={{
      connections, incomingRequests, events, rsvpd, myRsvps, allRsvps, allProfiles, totalMembers, profile, loading,
      isOnboarding: !calcProfileProgress(profile).isComplete,
      registerForEvent, cancelRegistration, updateConnection, saveConnection, clearTag, addConnection,
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
