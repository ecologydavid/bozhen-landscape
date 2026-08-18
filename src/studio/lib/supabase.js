import { createClient } from '@supabase/supabase-js'
import { readStudioEnv } from '../config/env'

const { supabaseUrl, supabasePublishableKey } = readStudioEnv()

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
