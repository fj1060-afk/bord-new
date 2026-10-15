import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quorumNeeded, quorumRule } from "@/lib/company";
import { journeyChecks } from "@/lib/journey";
import { companyProfile } from "@/lib/live-server";
import { riyadhToday } from "@/lib/minutes";
import { loadMinutesGaps } from "./minutes-check";

/** Everything the journey checks need for one meeting (RLS applies). */
export async function loadJourney(supabase: SupabaseClient, meetingId: string) {
  const { data: m } = await supabase
    .from("meetings")
    .select("status, live_status, starts_at, mode, location, virtual_link, pack_published_at, meeting_type, board_id, committee_id")
    .eq("id", meetingId)
    .single();
  if (!m) return null;
  const body = m.board_id ? { col: "board_id", id: m.board_id } : { col: "committee_id", id: m.committee_id! };
  const [profile, { data: items }, { data: requests }, { data: invitees }, { data: members }, { data: board }, { data: minutes }, { data: circulars }, { data: resolutions }, { data: overrides }] = await Promise.all([
    companyProfile(supabase),
    supabase.from("agenda_items").select("id, title, kind, owner_user_id, department_id").eq("meeting_id", meetingId),
    supabase.from("document_requests").select("title, status, item:agenda_items!inner(meeting_id)").eq("item.meeting_id", meetingId),
    supabase.from("meeting_invitees").select("person_id").eq("meeting_id", meetingId).eq("kind", "member"),
    m.board_id
      ? supabase.from("board_members").select("person_id").eq("board_id", m.board_id).eq("status", "active")
      : supabase.from("committee_members").select("person_id").eq("committee_id", m.committee_id!).eq("status", "active").neq("position", "secretary"),
    m.board_id ? supabase.from("boards").select("term_end").eq("id", m.board_id).single() : Promise.resolve({ data: null }),
    supabase.from("minutes").select("id, status").eq("meeting_id", meetingId).maybeSingle(),
    supabase.from("circular_resolutions").select("id").eq(body.col, body.id).eq("status", "passed").is("ratified_meeting_id", null),
    supabase.from("resolutions").select("id, tasks:resolution_tasks(id)").eq("meeting_id", meetingId).eq("status", "approved"),
    supabase.from("meeting_overrides").select("rule, reason").eq("meeting_id", meetingId),
  ]);
  const gaps = minutes ? await loadMinutesGaps(supabase, meetingId, minutes.id) : [];
  return journeyChecks({
    today: riyadhToday(),
    companyType: profile?.company_type ?? "unlisted_jsc",
    inviteDays: profile?.invite_days ?? 5,
    isBoard: !!m.board_id,
    boardTermEnd: board?.term_end ?? null,
    secretary: !!profile?.secretary_person_id,
    meeting: m,
    items: (items ?? []).map((i) => ({ title: i.title, kind: i.kind, owned: !!(i.owner_user_id || i.department_id) })),
    requests: (requests ?? []).map((r) => ({ title: r.title, status: r.status })),
    invitedMembers: (invitees ?? []).length,
    quorumNeeded: quorumNeeded((members ?? []).length, quorumRule(profile, !!m.board_id)),
    minutes: minutes ? { status: minutes.status, gaps } : null,
    unratifiedCirculars: (circulars ?? []).length,
    resolutionsWithoutTasks: (resolutions ?? []).filter((r) => !(r.tasks as unknown[]).length).length,
    overrides: Object.fromEntries((overrides ?? []).map((o) => [o.rule, o.reason])),
  });
}
