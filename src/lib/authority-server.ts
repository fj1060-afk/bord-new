import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Grant, Powers, Restrictable } from "./authority";
import { riyadhToday } from "./minutes";

/** The company's bylaws restrictions and assembly authorizations (readable by every signed-in user). */
export async function loadPowers(supabase: SupabaseClient): Promise<Powers> {
  const [{ data: profile }, { data: grants }] = await Promise.all([
    supabase.from("company_profile").select("bylaws_restrictions").maybeSingle(),
    supabase.from("ga_authorizations").select("kind, granted_on, expires_on"),
  ]);
  return { restricted: (profile?.bylaws_restrictions ?? []) as Restrictable[], grants: (grants ?? []) as Grant[], today: riyadhToday() };
}
