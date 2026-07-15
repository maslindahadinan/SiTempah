import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://lcmtjdpgpfzsoygoujlf.supabase.co"
const supabaseKey = "sb_publishable_Lo2DcF0Kb12lYnuPcmzfhw_3L-T_Beo"

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
