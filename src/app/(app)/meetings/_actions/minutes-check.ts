import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { minutesGaps } from "@/lib/secretary";

/** Loads what the completeness check needs for a meeting's minutes. */
export async function loadMinutesGaps(supabase: SupabaseClient, meetingId: string, minutesId: string) {
  const [{ data: meeting }, { data: members }, { data: attendance }, { data: items }, { data: rows }, { data: resolutions }] = await Promise.all([
    supabase.from("meetings").select("started_at, ended_at, location, mode").eq("id", meetingId).single(),
    supabase.from("meeting_invitees").select("person_id").eq("meeting_id", meetingId).eq("kind", "member"),
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("agenda_items").select("id, status").eq("meeting_id", meetingId),
    supabase.from("minutes_items").select("agenda_item_id, deliberation").eq("minutes_id", minutesId),
    supabase.from("resolutions").select("votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId),
  ]);
  if (!meeting) return ["تعذّر تحميل الاجتماع."];
  return minutesGaps({
    meeting,
    members: (members ?? []).map((m) => m.person_id),
    attendance: Object.fromEntries((attendance ?? []).map((a) => [a.person_id, a.status])),
    items: items ?? [],
    deliberation: Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation])),
    resolutions: resolutions ?? [],
  });
}
