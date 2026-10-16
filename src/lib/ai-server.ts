import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiAnswer, aiConfig, aiRequest, type ServiceSettings } from "./ai";

// If the row cannot be read, outside services stay off and the meeting switches keep their defaults.
const FALLBACK: ServiceSettings = {
  ai_enabled: false,
  ai_no_retention_confirmed: false,
  external_translation: false,
  external_spelling: false,
  remote_meetings: true,
  circular_enabled: true,
  pack_requires_disclosure: false,
  hide_contacts: false,
  watermark_documents: false,
  documents_view_only: false,
};

/** The site's switches (service_settings). */
export async function serviceSettings(supabase: SupabaseClient): Promise<ServiceSettings> {
  const { data } = await supabase.from("service_settings").select(Object.keys(FALLBACK).join(", ")).maybeSingle();
  return (data as ServiceSettings | null) ?? FALLBACK;
}

/**
 * One prompt to the configured AI provider, or null when AI is off, not
 * configured, or fails. The text is sent once and kept nowhere on our side:
 * no logs, no cache, no database row. Callers save only what a person accepts.
 */
export async function askAI(supabase: SupabaseClient, system: string, prompt: string): Promise<string | null> {
  const cfg = aiConfig(process.env);
  if (!cfg.ready || !(await serviceSettings(supabase)).ai_enabled) return null;
  try {
    const { headers, body } = aiRequest(cfg, system, prompt);
    const res = await fetch(cfg.url, { method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.warn("AI request failed", res.status);
      return null;
    }
    return aiAnswer(cfg, await res.json());
  } catch {
    console.warn("AI request failed");
    return null;
  }
}
