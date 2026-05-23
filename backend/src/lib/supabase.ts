import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS — backend use only.
// NEVER send this key to the frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
