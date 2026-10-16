import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quorumNeeded, quorumRule } from "@/lib/company";
import { journeyChecks } from "@/lib/journey";
import { libraryTemplates, matchTemplate } from "@/lib/item-templates";
import { meetingBody } from "@/lib/item-review-server";
import { companyProfile } from "@/lib/live-server";
import { riyadhToday } from "@/lib/minutes";
import { loadMinutesGaps } from "./minutes-check";

/** Everything the journey checks need for one meeting (RLS applies). */
export async function loadJourney(supabase: SupabaseClient, meetingId: string) {
  const { data: m } = await supabase
    .from("meetings")
    .select("title, status, live_status, starts_at, mode, location, virtual_link, pack_published_at, pack_emailed_at, meeting_type, board_id, committee_id")
    .eq("id", meetingId)
    .single();
  if (!m) return null;
  const body = m.board_id ? { col: "board_id", id: m.board_id } : { col: "committee_id", id: m.committee_id! };
  const [profile, { data: items }, { data: requests }, { data: invitees }, { data: members }, { data: board }, { data: minutes }, { data: circulars }, { data: resolutions }, { data: overrides }] = await Promise.all([
    companyProfile(supabase),
    supabase.from("agenda_items").select("id, title, kind, owner_user_id, department_id").eq("meeting_id", meetingId),
    supabase.from("document_requests").select("title, status, agenda_item_id, item:agenda_items!inner(meeting_id)").eq("item.meeting_id", meetingId),
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
  const [{ data: reqRows }, { data: own }] = await Promise.all([
    supabase.from("agenda_item_requirements").select("agenda_item_id, kind, label, status, custom, checked_at, due_date").eq("meeting_id", meetingId),
    supabase.from("agenda_item_library").select("title, title_en, body, kind, category, needs"),
  ]);
  const library = libraryTemplates(own ?? []);
  const wordings = await meetingBody(supabase, meetingId);
  const wanted = new Map((items ?? []).map((i) => [i.id, new Set((matchTemplate(i.title, library, wordings)?.reqs ?? []).map((r) => r.ar))]));
  const live = (reqRows ?? []).filter((r) => r.status !== "dismissed");
  const unsent = live.filter((r) => r.status === "draft" || (!r.custom && r.status === "sent" && !wanted.get(r.agenda_item_id)?.has(r.label)));
  const unchecked = live.filter((r) => r.kind === "check" && !r.checked_at);
  return journeyChecks({
    today: riyadhToday(),
    companyType: profile?.company_type ?? "unlisted_jsc",
    inviteDays: profile?.invite_days ?? 5,
    isBoard: !!m.board_id,
    boardTermEnd: board?.term_end ?? null,
    secretary: !!profile?.secretary_person_id,
    meeting: m,
    items: (items ?? []).map((i) => ({ id: i.id, title: i.title, kind: i.kind, owned: !!(i.owner_user_id || i.department_id) })),
    requests: (requests ?? []).map((r) => ({ title: r.title, status: r.status, itemId: r.agenda_item_id })),
    requirements: {
      unsent: unsent.length,
      unchecked: unchecked.map((r) => r.label),
      unsentItems: unsent.map((r) => r.agenda_item_id),
      uncheckedItems: unchecked.map((r) => r.agenda_item_id),
      dues: live.filter((r) => r.status === "draft" && r.due_date).map((r) => ({ itemId: r.agenda_item_id, due: r.due_date! })),
    },
    invitedMembers: (invitees ?? []).length,
    quorumNeeded: quorumNeeded((members ?? []).length, quorumRule(profile, !!m.board_id)),
    minutes: minutes ? { status: minutes.status, gaps } : null,
    unratifiedCirculars: (circulars ?? []).length,
    resolutionsWithoutTasks: (resolutions ?? []).filter((r) => !(r.tasks as unknown[]).length).length,
    overrides: Object.fromEntries((overrides ?? []).map((o) => [o.rule, o.reason])),
  });
}
