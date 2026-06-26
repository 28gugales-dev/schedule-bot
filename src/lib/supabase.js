import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Build-time kill switch: VITE_FORCE_DEMO=true forces stub/demo mode even when
// Supabase creds ARE present in the environment. Used by the public demo
// deployment (schedule-bot-demo) so a single project can ship a real-backend
// build AND a credential-free demo build without deleting the stored env vars.
const forceDemo = import.meta.env.VITE_FORCE_DEMO === 'true'

// When env vars are absent (e.g. fresh clone, CI build) we run in "stub mode":
// the client is null and AuthProvider degrades gracefully so the UI still renders.
export const isSupabaseConfigured = Boolean(url && anonKey) && !forceDemo

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — running in stub mode (no real auth/data).',
  )
}

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
