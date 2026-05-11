import { createClient } from '@supabase/supabase-js'

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase public env vars are missing')
  }

  return createClient(url, key)
}
