import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Affiliation } from "./affiliations";
import { bodyOf, type Body } from "./item-templates";
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

/** Current CV positions of the members of the meeting's board or committee (RLS applies). */
export async function meetingAffiliations(supabase: SupabaseClient, meetingId: string): Promise<Affiliation[]> {
  const { data: m } = await supabase.from("meetings").select("board_id, committee_id").eq("id", meetingId).maybeSingle();
  if (!m) return [];
  return bodyAffiliations(supabase, m.board_id ? { board: m.board_id } : { committee: m.committee_id });
}

/** Current CV positions of a board's or committee's active members. */
export async function bodyAffiliations(supabase: SupabaseClient, body: { board?: string | null; committee?: string | null }): Promise<Affiliation[]> {
  const { data: members } = body.board
    ? await supabase.from("board_members").select("person_id").eq("board_id", body.board).eq("status", "active")
    : await supabase.from("committee_members").select("person_id").eq("committee_id", body.committee ?? "").eq("status", "active");
  const ids = (members ?? []).map((r) => r.person_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("person_positions").select("organization, role, title, end_year, person:people(full_name)").in("person_id", ids).is("end_year", null);
  return ((data ?? []) as unknown as { organization: string; role: Affiliation["role"]; title: string | null; end_year: number | null; person: { full_name: string } | null }[]).map((p) => ({
    name: p.person?.full_name ?? "",
    organization: p.organization,
    role: p.role,
    title: p.title,
    current: p.end_year === null,
  }));
}

/** The committee kind of a committee meeting; undefined for the board's. */
export async function meetingCommitteeKind(supabase: SupabaseClient, meetingId: string): Promise<string | undefined> {
  const { data } = await supabase.from("meetings").select("board_id, committee:committees(kind)").eq("id", meetingId).maybeSingle();
  return data?.board_id ? undefined : ((data?.committee as { kind?: string } | null)?.kind ?? "other");
}

/** Which wordings a meeting may use: the board's, one committee kind's, or only the general ones. */
export async function meetingBody(supabase: SupabaseClient, meetingId: string): Promise<Body> {
  const kind = await meetingCommitteeKind(supabase, meetingId);
  return bodyOf({ board_id: kind === undefined ? "board" : null, committee_kind: kind });
}
