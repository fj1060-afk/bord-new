import "server-only";
import { notFound } from "next/navigation";
import { quorumRule } from "@/lib/company";
import { quorum, type AttendanceStatus } from "@/lib/live";
import { companyProfile } from "@/lib/live-server";
import { BOARD_ROLES_EN, COMMITTEE_ROLES_EN } from "@/lib/doc-labels";
import { createClient } from "@/lib/supabase/server";

export type Person = { person_id: string; name: string; role: string; category: string | null; job: string | null };

/** Everything the printed meeting documents share: meeting, body, people, attendance and quorum (RLS applies). */
export async function loadMeeting(meetingId: string) {
  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, number, meeting_type, starts_at, duration_minutes, mode, location, location_en, virtual_link, agenda_intro, agenda_intro_en, attendance_intro, attendance_intro_en, status, pack_published_at, started_at, ended_at, board_id, committee_id, quorum_required, board:boards(name), committee:committees(name)")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) notFound();

  const [profile, { data: invitees }, { data: attendance }, { data: proxies }, { data: roles }] = await Promise.all([
    companyProfile(supabase),
    supabase.from("meeting_invitees").select("person_id, kind, person:people(full_name, full_name_en, job_title, organization, executive_title)").eq("meeting_id", meetingId),
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("meeting_proxies").select("grantor_person_id, holder_person_id").eq("meeting_id", meetingId),
    meeting.board_id
      ? supabase.from("board_members").select("person_id, position, category").eq("board_id", meeting.board_id).eq("status", "active")
      : supabase.from("committee_members").select("person_id, position").eq("committee_id", meeting.committee_id!).eq("status", "active"),
  ]);

  const BOARD_ROLES: Record<string, string> = { chair: "رئيس المجلس", vice_chair: "نائب الرئيس", member: "عضو" };
  const COMMITTEE_ROLES: Record<string, string> = { chair: "رئيس اللجنة", member: "عضو", secretary: "أمين اللجنة" };
  const roleOf = new Map((roles ?? []).map((r) => [r.person_id, r as { person_id: string; position: string; category?: string }]));
  type Row = { person_id: string; kind: string; person: { full_name: string; full_name_en: string | null; job_title: string | null; organization: string | null; executive_title: string | null } | null };
  const people = ((invitees ?? []) as unknown as Row[]).map((i) => {
    const r = roleOf.get(i.person_id);
    return {
      kind: i.kind,
      person_id: i.person_id,
      name: i.person?.full_name ?? "",
      nameEn: i.person?.full_name_en ?? "",
      role: r ? (meeting.board_id ? BOARD_ROLES : COMMITTEE_ROLES)[r.position] ?? "عضو" : "",
      roleEn: r ? (meeting.board_id ? BOARD_ROLES_EN : COMMITTEE_ROLES_EN)[r.position] ?? "Member" : "",
      category: r?.category ?? null,
      job: [i.person?.executive_title ?? i.person?.job_title, i.person?.organization].filter(Boolean).join(" · ") || null,
      position: r?.position ?? "",
    };
  });
  const order = { chair: 0, vice_chair: 1, member: 2, secretary: 3 } as Record<string, number>;
  const members = people.filter((p) => p.kind === "member").sort((a, b) => (order[a.position] ?? 9) - (order[b.position] ?? 9) || a.name.localeCompare(b.name, "ar"));
  const guests = people.filter((p) => p.kind !== "member");
  const status = Object.fromEntries((attendance ?? []).map((a) => [a.person_id, a.status as AttendanceStatus]));
  const holderOf = Object.fromEntries((proxies ?? []).map((p) => [p.grantor_person_id, p.holder_person_id]));
  const q = quorum({
    members: members.map((m) => m.person_id),
    attendance: status,
    proxies: (proxies ?? []).map((p) => ({ grantor: p.grantor_person_id, holder: p.holder_person_id })),
    required: meeting.quorum_required,
    rule: quorumRule(profile, !!meeting.board_id),
  });
  const names = Object.fromEntries(people.map((p) => [p.person_id, p.name]));
  const chair = members.find((m) => m.position === "chair");
  const secretaryId = meeting.board_id ? profile?.secretary_person_id : members.find((m) => m.position === "secretary")?.person_id;
  const { data: secretary } = secretaryId ? await supabase.from("people").select("full_name, full_name_en").eq("id", secretaryId).maybeSingle() : { data: null };
  const present = members.filter((m) => status[m.person_id] === "present" || status[m.person_id] === "remote").length;
  const byProxy = members.filter((m) => status[m.person_id] === "proxy").length;

  return {
    supabase,
    meeting,
    body: ((meeting.board ?? meeting.committee) as unknown as { name: string } | null)?.name ?? "",
    isBoard: !!meeting.board_id,
    company: profile?.name || "الشركة",
    companyEn: profile?.name_en || "",
    bi: profile?.document_language === "bilingual",
    namesEn: Object.fromEntries(people.map((p) => [p.person_id, p.nameEn])),
    chairEn: chair?.nameEn ?? "",
    secretaryEn: secretary?.full_name_en ?? "",
    members,
    guests,
    status,
    holderOf,
    names,
    quorum: { ...q, present, byProxy },
    held: new Date(meeting.started_at ?? meeting.starts_at),
    chair: chair?.name ?? "",
    secretary: secretary?.full_name ?? "",
  };
}
