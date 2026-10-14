import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quorum, type AttendanceStatus } from "./live";

/** Loads a meeting's members, attendance and proxies and computes its quorum (RLS applies). */
export async function meetingQuorum(supabase: SupabaseClient, meetingId: string) {
  const [{ data: meeting }, { data: invitees }, { data: attendance }, { data: proxies }] = await Promise.all([
    supabase.from("meetings").select("quorum_required").eq("id", meetingId).single(),
    supabase.from("meeting_invitees").select("person_id").eq("meeting_id", meetingId).eq("kind", "member"),
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("meeting_proxies").select("grantor_person_id, holder_person_id").eq("meeting_id", meetingId),
  ]);
  return quorum({
    members: (invitees ?? []).map((i) => i.person_id),
    attendance: Object.fromEntries((attendance ?? []).map((a) => [a.person_id, a.status as AttendanceStatus])),
    proxies: (proxies ?? []).map((p) => ({ grantor: p.grantor_person_id, holder: p.holder_person_id })),
    required: meeting?.quorum_required,
  });
}
