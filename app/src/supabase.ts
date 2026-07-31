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
  linkedin_url: string
  instagram_url: string
  website_url: string
  notify_email: boolean
  email: string | null
  city: string | null
  industry: string | null
  tech_background: string | null
  current_focus: string | null
  skills: Record<string, number> | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export type ProfileGoal = {
  id: string
  profile_id: string
  goal: string
  is_custom: boolean
  done: boolean
  created_at: string
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

export async function getProfileGoals(profileId: string, token?: string | null): Promise<ProfileGoal[]> {
  const db = getSupabaseClient(token)
  const { data, error } = await db
    .from('profile_goals')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error || !data) { console.error('getProfileGoals error:', error); return [] }
  return data as ProfileGoal[]
}

export async function setProfileGoals(
  profileId: string,
  goals: string[],
  isCustom: boolean[],
  token?: string | null
): Promise<boolean> {
  const db = getSupabaseClient(token)
  const { error: deleteError } = await db.from('profile_goals').delete().eq('profile_id', profileId)
  if (deleteError) { console.error('setProfileGoals delete error:', deleteError); return false }
  if (goals.length === 0) return true
  const rows = goals.map((goal, i) => ({ profile_id: profileId, goal, is_custom: isCustom[i] ?? false }))
  const { error: insertError } = await db.from('profile_goals').insert(rows)
  if (insertError) { console.error('setProfileGoals insert error:', insertError); return false }
  return true
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
