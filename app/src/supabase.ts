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
  })
}

export type Profile = {
  clerk_user_id: string
  full_name: string
  bio: string
  role_category: string
  avatar_color: string
  slug: string
  linkedin_url: string
  instagram_url: string
  website_url: string
  notify_email: boolean
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
