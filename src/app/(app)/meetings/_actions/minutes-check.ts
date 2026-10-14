import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { companyProfile, meetingQuorum } from "@/lib/live-server";
import { resolutionReference } from "@/lib/minutes";
import { minutesGaps } from "@/lib/secretary";

/** Loads what the completeness check needs for a meeting's minutes. */
export async function loadMinutesGaps(supabase: SupabaseClient, meetingId: string, minutesId: string) {
  const [{ data: meeting }, { data: members }, { data: attendance }, { data: items }, { data: rows }, { data: resolutions }, { data: minutes }, { data: recusals }, profile, q] = await Promise.all([
    supabase.from("meetings").select("started_at, ended_at, location, mode, board_id, committee_id").eq("id", meetingId).single(),
    supabase.from("meeting_invitees").select("person_id").eq("meeting_id", meetingId).eq("kind", "member"),
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("agenda_items").select("id, status").eq("meeting_id", meetingId),
    supabase.from("minutes_items").select("agenda_item_id, deliberation, deliberation_en").eq("minutes_id", minutesId),
    supabase.from("resolutions").select("id, number, year, text_en, votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId),
    supabase.from("minutes").select("intro_en, closing_en").eq("id", minutesId).single(),
    supabase.from("minutes_remarks").select("resolution_id").eq("minutes_id", minutesId).eq("kind", "recusal"),
    companyProfile(supabase),
    meetingQuorum(supabase, meetingId),
  ]);
  if (!meeting) return ["تعذّر تحميل الاجتماع."];
  const { data: chair } = meeting.board_id
    ? await supabase.from("board_members").select("person_id").eq("board_id", meeting.board_id).eq("status", "active").eq("position", "chair").limit(1)
    : await supabase.from("committee_members").select("person_id").eq("committee_id", meeting.committee_id!).eq("status", "active").eq("position", "chair").limit(1);
  return minutesGaps({
    meeting,
    members: (members ?? []).map((m) => m.person_id),
    attendance: Object.fromEntries((attendance ?? []).map((a) => [a.person_id, a.status])),
    items: items ?? [],
    deliberation: Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation])),
    resolutions: (resolutions ?? []).map((r) => ({
      ...r,
      number: resolutionReference(r.number, r.year),
      recused: (recusals ?? []).filter((x) => x.resolution_id === r.id).length,
    })),
    counted: q.counted,
    chair: (chair ?? []).length > 0,
    secretary: meeting.board_id ? !!profile?.secretary_person_id : true,
    english:
      profile?.document_language === "bilingual"
        ? { intro: minutes?.intro_en ?? null, closing: minutes?.closing_en ?? null, deliberation: Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation_en])) }
        : undefined,
  });
}
