import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabaseAdmin = createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_KEY as string, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getSupabaseForToken(token: string) {
  return createClient(env.SUPABASE_URL as string, env.SUPABASE_ANON_KEY as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
