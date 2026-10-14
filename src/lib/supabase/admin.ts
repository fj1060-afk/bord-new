import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** False when the deployment has no secret key, so account actions cannot run. */
export function adminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

/**
 * Supabase client with the secret key. It bypasses row-level security, so use it
 * only for Auth admin calls (invite, ban) after checking the caller's permission.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Set SUPABASE_SECRET_KEY (see .env.example).");
  return createClient(supabaseEnv().url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
