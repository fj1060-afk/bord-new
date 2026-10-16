import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MailMeeting } from "./meeting-mail";
import { siteUrl } from "./site-url";

export type Recipient = { key: string; name: string; to: string[]; requests: { item: string; label: string; due: string | null }[] };
type Contact = { kind: "invitee" | "user" | "department"; ref: string; name: string; email: string | null };

/** Everything the meeting's Outlook messages need: wording context, members, open requests per recipient, items with documents. */
export async function meetingMail(supabase: SupabaseClient, meetingId: string, secretary: string) {
  const [{ data: m }, { data: contacts }, { data: items }, { data: docs }, { data: requests }, base] = await Promise.all([
    supabase.from("meetings").select("title, starts_at, duration_minutes, mode, location, virtual_link, board:boards(name), committee:committees(name)").eq("id", meetingId).single(),
    supabase.rpc("meeting_contacts", { p_meeting: meetingId }),
    supabase.from("agenda_items").select("id, title").eq("meeting_id", meetingId).order("position"),
    supabase.from("meeting_documents").select("title, agenda_item_id").eq("meeting_id", meetingId),
    supabase
      .from("document_requests")
      .select("title, due_date, status, department_id, assignee_user_id, department:departments(name), item:agenda_items!inner(title, meeting_id)")
      .eq("item.meeting_id", meetingId)
      .in("status", ["requested", "returned"]),
    siteUrl(),
  ]);
  if (!m) return null;
  const all = (contacts ?? []) as Contact[];
  const body = ((m.board ?? m.committee) as unknown as { name: string } | null)?.name ?? "";
  const place = [m.mode !== "virtual" && m.location, m.mode !== "in_person" && m.virtual_link].filter(Boolean).join(" · ") || "—";
  const meeting: MailMeeting = { title: m.title, body, startsAt: m.starts_at, place, url: `${base}/meetings/${meetingId}`, secretary };

  // One message per user, or per department (to all its delegates).
  const recipients = new Map<string, Recipient>();
  type Req = { title: string; due_date: string | null; department_id: string | null; assignee_user_id: string | null; department: { name: string } | null; item: { title: string } };
  for (const r of (requests ?? []) as unknown as Req[]) {
    const key = r.assignee_user_id ? `user:${r.assignee_user_id}` : `department:${r.department_id}`;
    if (!recipients.has(key)) {
      const people = all.filter((c) => (r.assignee_user_id ? c.kind === "user" && c.ref === r.assignee_user_id : c.kind === "department" && c.ref === r.department_id));
      recipients.set(key, { key, name: r.assignee_user_id ? (people[0]?.name ?? "") : (r.department?.name ?? ""), to: [...new Set(people.map((p) => p.email).filter((e): e is string => !!e))], requests: [] });
    }
    recipients.get(key)!.requests.push({ item: r.item.title, label: r.title, due: r.due_date });
  }

  return {
    meeting,
    minutes: m.duration_minutes as number,
    invitees: all.filter((c) => c.kind === "invitee").map((c) => ({ name: c.name, email: c.email })),
    recipients: [...recipients.values()],
    items: (items ?? []).map((i) => ({ title: i.title, documents: (docs ?? []).filter((d) => d.agenda_item_id === i.id).map((d) => d.title) })),
    tasksUrl: `${base}/my-tasks`,
  };
}
