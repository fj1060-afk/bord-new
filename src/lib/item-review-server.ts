import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Disclosure } from "./item-review";
import { currentYear } from "./org";

/** This year's conflict disclosures of the members of the meeting's board or committee (RLS applies). */
export async function meetingDisclosures(supabase: SupabaseClient, meetingId: string): Promise<Disclosure[]> {
  const { data: m } = await supabase.from("meetings").select("board_id, committee_id").eq("id", meetingId).maybeSingle();
  if (!m) return [];
  const { data: members } = m.board_id
    ? await supabase.from("board_members").select("person_id").eq("board_id", m.board_id).eq("status", "active")
    : await supabase.from("committee_members").select("person_id").eq("committee_id", m.committee_id).eq("status", "active");
  const ids = (members ?? []).map((r) => r.person_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("disclosures").select("details, person:people(full_name)").eq("year", currentYear()).eq("has_conflict", true).in("person_id", ids);
  return ((data ?? []) as unknown as { details: string | null; person: { full_name: string } | null }[]).map((d) => ({ name: d.person?.full_name ?? "", details: d.details }));
}
