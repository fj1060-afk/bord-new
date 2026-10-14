import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluate, type Snapshot } from "./compliance";
import { currentYear } from "./org";
import { companyProfile } from "./live-server";
import { riyadhToday } from "./minutes";

type Named = { person_id: string; person: { full_name: string } | null };
const named = <T extends Named>(rows: T[] | null) => (rows ?? []).map(({ person, ...r }) => ({ ...r, name: person?.full_name ?? "" }));

/** Loads what the rules need (RLS applies) and evaluates them. */
export async function complianceFindings(supabase: SupabaseClient) {
  const today = riyadhToday();
  const since = `${Number(today.slice(0, 4)) - 1}-01-01T00:00:00+03:00`;
  const [profile, { data: board }, { data: committees }, { data: meetings }, { data: disclosures }, { data: executives }, { data: circulars }] = await Promise.all([
    companyProfile(supabase),
    supabase.from("boards").select("id, term_end").eq("status", "active").order("term_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("committees").select("id, name, kind, committee_members(person_id, position, status, person:people(full_name))").eq("status", "active"),
    supabase.from("meetings").select("id, board_id, committee_id, starts_at, live_status, meeting_type, pack_published_at").neq("status", "cancelled").gte("starts_at", since),
    supabase.from("disclosures").select("person_id").eq("year", currentYear()),
    supabase.from("people").select("id, full_name").not("executive_title", "is", null),
    supabase.from("circular_resolutions").select("id, title, board_id, committee_id, closed_at, ratified_meeting_id").eq("status", "passed"),
  ]);
  if (!profile) return null;
  const { data: members } = board
    ? await supabase.from("board_members").select("person_id, category, position, person:people(full_name)").eq("board_id", board.id).eq("status", "active")
    : { data: [] };
  const endedBoard = (meetings ?? []).filter((m) => m.board_id && m.live_status === "ended").map((m) => m.id);
  const { data: attendance } = endedBoard.length
    ? await supabase.from("meeting_attendance").select("meeting_id, person_id, status").in("meeting_id", endedBoard)
    : { data: [] };

  const snapshot: Snapshot = {
    today,
    profile,
    board,
    boardMembers: named(members as unknown as (Named & { category: string; position: string })[]),
    committees: ((committees ?? []) as unknown as { id: string; name: string; kind: string; committee_members: (Named & { position: string; status: string })[] }[]).map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      members: named(c.committee_members.filter((m) => m.status === "active")),
    })),
    meetings: (meetings ?? []).map((m) => ({
      id: m.id,
      body: m.board_id ? "board" : m.committee_id!,
      starts_at: m.starts_at,
      ended: m.live_status === "ended",
      extraordinary: m.meeting_type === "extraordinary",
      pack_published_at: m.pack_published_at,
    })),
    attendance: attendance ?? [],
    disclosed: (disclosures ?? []).map((d) => d.person_id),
    executives: (executives ?? []).map((e) => ({ person_id: e.id, name: e.full_name })),
    circulars: (circulars ?? []).map((c) => ({ id: c.id, title: c.title, body: c.board_id ? "board" : c.committee_id!, closed_at: c.closed_at, ratified: !!c.ratified_meeting_id })),
  };
  return evaluate(snapshot);
}
