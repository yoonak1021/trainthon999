import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase browser client.
 *
 * Set these in `.env` (see `.env.example`):
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * When either value is missing, `isSupabaseConfigured` is false and the app
 * falls back to the local demo store (`src/lib/localStore.ts`) so the
 * participant + researcher UIs remain usable without a live project.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('YOUR_') &&
    !supabaseAnonKey.includes('YOUR_'),
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
