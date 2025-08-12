// services/supabaseClient.ts
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { env } from "../utils/env.ts";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;
