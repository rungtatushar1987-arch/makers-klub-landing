import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Static anon client — for unauthenticated/public reads only.
// Prefer getSupabaseClient(token) anywhere a signed-in user's identity matters.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Returns a Supabase client that attaches a Clerk session JWT on every request.
 */
export function getSupabaseClient(token: string | null | undefined) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  })
}

export type Profile = {
  id: string
  clerk_user_id: string
  full_name: string
  bio: string
  role_category: string
  avatar_color: string
  slug: string
  linkedin_url: string | null
  instagram_url: string | null
  website_url: string | null
  notify_email: boolean
  email: string | null
  city: string | null
  industry: string | null
  tech_background: string | null
  looking_to: string | null
  industries: string[] | null
  locations: string[] | null
  services: string[] | null
  service_pricing: Record<string, { experience: string; hourlyRate: string }> | null
  social_links: Record<string, string> | null
  income_goal: string | null
  client_capacity: string | null
  lead_availability: string | null
  current_focus: string | null
  skills: Record<string, number> | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

/**
 * Single source of truth for "profile completeness" — used by both the
 * Profile page and the home welcome card, so they never disagree.
 */
export function calcProfileProgress(p: Partial<Profile> | null | undefined): { pct: number; fieldsLeft: number; isComplete: boolean } {
  const has = [
    !!p?.full_name?.trim(),
    !!p?.looking_to,
    !!(p?.industries && p.industries.length > 0),
    !!(p?.locations && p.locations.length > 0),
    !!(p?.services && p.services.length > 0),
    !!p?.website_url?.trim(),
    !!p?.income_goal,
    !!p?.client_capacity,
    !!p?.lead_availability,
  ]
  const filled = has.filter(Boolean).length
  return { pct: Math.round((filled / has.length) * 100), fieldsLeft: has.length - filled, isComplete: filled === has.length }
}

export type Event = {
  id: string
  title: string
  date: string
  end_date: string
  location: string
  address: string
  type: string
  description: string
  luma_url: string
  cover_color: string
  is_free: boolean
  ticket_price: number | null
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined'

export type Connection = {
  id: string
  clerk_user_id: string
  connected_clerk_user_id: string
  event_name: string
  notes: string
  action_tags: string[]
  remind_followup: boolean
  status: ConnectionStatus
  created_at: string
  profile?: Profile
  direction?: 'outgoing' | 'incoming'
}

export const ACTION_TAGS = [
  'Intro call',
  'Send email',
  'Share portfolio',
  'Collab discussion',
  'Send CV',
  'Make introduction',
  'Follow up',
  'Connect on LinkedIn',
]

export const AVATAR_COLORS = ['#f4a833', '#cdbcf5', '#0f1e3d', '#e89a1f', '#b8a2eb', '#5dcaa5', '#f0997b']

export function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

/**
 * Upsert the caller's profile row, keyed on clerk_user_id.
 */
export async function upsertProfile(
  clerkUserId: string,
  updates: Partial<Omit<Profile, 'id' | 'clerk_user_id' | 'created_at'>>,
  token?: string | null
): Promise<Profile | null> {
  const db = getSupabaseClient(token)
  const { data, error } = await db
    .from('profiles')
    .upsert({ clerk_user_id: clerkUserId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'clerk_user_id' })
    .select().single()
  if (error || !data) { console.error('upsertProfile error:', error); return null }
  return data as Profile
}

/**
 * Accept an incoming connection request.
 * Only the target user (connected_clerk_user_id) can call this — enforced by RLS.
 */
export async function acceptConnection(connectionId: string, token?: string | null): Promise<boolean> {
  const db = getSupabaseClient(token)
  const { error } = await db
    .from('connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId)
  if (error) console.error('acceptConnection error:', error)
  return !error
}

/**
 * Decline an incoming connection request.
 * Only the target user (connected_clerk_user_id) can call this — enforced by RLS.
 */
export async function declineConnection(connectionId: string, token?: string | null): Promise<boolean> {
  const db = getSupabaseClient(token)
  const { error } = await db
    .from('connections')
    .update({ status: 'declined' })
    .eq('id', connectionId)
  if (error) console.error('declineConnection error:', error)
  return !error
}
