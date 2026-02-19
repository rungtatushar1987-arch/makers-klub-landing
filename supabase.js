import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfvigqggnpajnidkutmk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdmlncWdnbnBham5pZGt1dG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM4ODUsImV4cCI6MjA4NzAwOTg4NX0.bKDr7hMLHAme7S4uv25mc-aCr_LmJ3I_K_ppNJJIegQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Add user to waitlist
 * Duplicate protection handled by UNIQUE constraint in database
 */
export async function addToWaitlist(name, email, role) {
  try {
    const { error } = await supabase
      .from('waitlist')
      .insert([
        { 
          name: name.trim(), 
          email: email.toLowerCase().trim(), 
          role,
          created_at: new Date().toISOString()
        }
      ])

    if (error) {
      if (error.code === '23505') {
        return { error: 'duplicate' }
      }
      throw error
    }

    return { error: null }
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    return { error }
  }
}

/**
 * Get total waitlist count
 * Uses secure RPC function (no direct SELECT access)
 */
export async function getWaitlistCount() {
  try {
    const { data, error } = await supabase.rpc('get_waitlist_count')

    if (error) throw error

    return data || 0
  } catch (error) {
    console.error('Error getting count:', error)
    return 0
  }
}