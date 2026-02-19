import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfvigqggnpajnidkutmk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdmlncWdnbnBham5pZGt1dG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzM4ODUsImV4cCI6MjA4NzAwOTg4NX0.bKDr7hMLHAme7S4uv25mc-aCr_LmJ3I_K_ppNJJIegQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Check if an email already exists in the waitlist
 */
export async function addToWaitlist(name, email, role) {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        { 
          name: name.trim(), 
          email: email.toLowerCase().trim(), 
          role: role,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'duplicate' }
      }
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    return { data: null, error }
  }
}


/**
 * Add a new person to the waitlist
 */
export async function addToWaitlist(name, email, role) {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        { 
          name: name.trim(), 
          email: email.toLowerCase().trim(), 
          role: role,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    return { data, error }
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    return { data: null, error }
  }
}

/**
 * Get total waitlist count
 */
export async function getWaitlistCount() {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('Error getting count:', error)
    return 0
  }
}
