import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || ''

export const isSupabaseConfigured = Boolean(url && anonKey)

// Falls back to placeholders so the module loads without env vars.
// Auth calls will fail at runtime until credentials are added to .env.local.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'placeholder-anon-key'
)
