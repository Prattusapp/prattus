import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('DEBUG SUPABASE URL:', supabaseUrl)
console.log('DEBUG SUPABASE KEY:', supabaseAnonKey ? 'PRESENTE' : 'AUSENTE')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
