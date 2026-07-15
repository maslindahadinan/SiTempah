import { createClient } from "@supabase/supabase-js"

// Supabase configuration - uses environment variables with fallbacks
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY in Vercel dashboard
// Or update these defaults with your Supabase project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lcmtjdpgpfzsoygoujlf.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_Lo2DcF0Kb12lYnuPcmzfhw_3L-T_Beo"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      "X-Client-Info": "sitempah-supabase-wrapper",
    },
  },
})

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_KEY = supabaseKey
