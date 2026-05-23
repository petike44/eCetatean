import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isSupabaseConfigured = Boolean(url && key)

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️  Supabase nu este configurat (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY lipsesc).\n' +
      '   Server-ul pornește, dar endpoints care folosesc baza de date vor returna erori.'
  )
}

// Service role client — bypasses RLS — backend use only.
// NEVER send this key to the frontend.
// Falls back to placeholders so the module loads even without env vars;
// actual DB calls will fail at runtime with a clear error.
export const supabaseAdmin = createClient(
  url || 'http://localhost:54321',
  key || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
