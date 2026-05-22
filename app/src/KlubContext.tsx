import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase, type Event, type Profile, type Connection, AVATAR_COLORS } from './supabase'

type KlubContextType = {
  connections: Connection[]
  events: Event[]
  rsvpd: Set<string>
  loading: boolean
  toggleRsvp: (event: Event) => Promise<void>
  updateConnection: (id: string, patch: Partial<Connection>) => void
  saveConnection: (conn: Connection) => Promise<void>
  clearTag: (conn: Connection, tag: string) => Promise<void>
  addConnection: (conn: Connection) => void
  refresh: () => Promise<void>
}

const KlubContext = createContext<KlubContextType | null>(null)

export function KlubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [connections, setConnections] = useState<Connection[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return

    // Ensure a profile row exists for this user
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('clerk_user_id')
      .eq('clerk_user_id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.emailAddresses[0]?.emailAddress || ''
      const slug = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + user.id.slice(-6)
      await supabase.from('profiles').insert({
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

    const [{ data: connsData }, { data: eventsData }, { data: rsvpData }] = await Promise.all([
      supabase.from('connections').select('*').eq('clerk_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('date'),
      supabase.from('event_rsvps').select('event_id').eq('clerk_user_id', user.id)
    ])

    if (eventsData) setEvents(eventsData)
    if (rsvpData) setRsvpd(new Set(rsvpData.map((r: { event_id: string }) => r.event_id)))

    if (connsData) {
      const ids = connsData.map((c: Connection) => c.connected_clerk_user_id)
      if (ids.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('*').in('clerk_user_id', ids)
        const profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
        setConnections(connsData.map((c: Connection) => ({
          ...c,
          action_tags: c.action_tags || [],
          remind_followup: c.remind_followup || false,
          profile: profileMap.get(c.connected_clerk_user_id)
        })))
      } else {
        setConnections([])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  async function toggleRsvp(event: Event) {
    if (event.luma_url) { window.open(event.luma_url, '_blank'); return }
    const going = rsvpd.has(event.id)
    if (going) {
      await supabase.from('event_rsvps').delete().eq('clerk_user_id', user?.id).eq('event_id', event.id)
      setRsvpd(prev => { const s = new Set(prev); s.delete(event.id); return s })
    } else {
      await supabase.from('event_rsvps').insert({ clerk_user_id: user?.id, event_id: event.id, status: 'going' })
      setRsvpd(prev => new Set([...prev, event.id]))
    }
  }

  function updateConnection(id: string, patch: Partial<Connection>) {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  async function saveConnection(conn: Connection) {
    await supabase.from('connections').update({
      notes: conn.notes,
      action_tags: conn.action_tags,
      remind_followup: conn.remind_followup
    }).eq('id', conn.id)
  }

  async function clearTag(conn: Connection, tag: string) {
    const tags = conn.action_tags.filter(t => t !== tag)
    updateConnection(conn.id, { action_tags: tags })
    await supabase.from('connections').update({ action_tags: tags }).eq('id', conn.id)
  }

  function addConnection(conn: Connection) {
    setConnections(prev => [conn, ...prev])
  }

  return (
    <KlubContext.Provider value={{
      connections, events, rsvpd, loading,
      toggleRsvp, updateConnection, saveConnection, clearTag, addConnection,
      refresh: load
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
