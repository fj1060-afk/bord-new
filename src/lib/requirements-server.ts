import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { meetingBody } from "./item-review-server";
import { libraryTemplates, matchTemplate, type Body } from "./item-templates";
import { companyProfile } from "./live-server";
import { departmentFor, planSync, type Req, type ReqFrom, type ReqRow } from "./requirements";

const COMMITTEE_KINDS: Partial<Record<ReqFrom, string[]>> = { audit: ["audit"], nrc: ["nomination", "remuneration", "remuneration_nomination"], risk: ["risk"] };

/** The requirements an agenda item's title calls for (from the standard wording it follows, if any). */
export async function wantedRequirements(supabase: SupabaseClient, title: string, body?: Body): Promise<Req[]> {
  const { data: own } = await supabase.from("agenda_item_library").select("title, title_en, body, kind, category, needs");
  return matchTemplate(title, libraryTemplates(own ?? []), body)?.reqs ?? [];
}

/**
 * Re-drafts an item's requirements after it is saved. Nothing is sent: rows
 * stay drafts until the secretary sends them for the whole meeting.
 */
export async function syncItemRequirements(supabase: SupabaseClient, meetingId: string, itemId: string) {
  const [{ data: item }, { data: meeting }, { data: rows }, { data: departments }, { data: committees }, profile] = await Promise.all([
    supabase.from("agenda_items").select("title, department_id, owner_user_id").eq("id", itemId).single(),
    supabase.from("meetings").select("starts_at").eq("id", meetingId).single(),
    supabase.from("agenda_item_requirements").select("id, label, kind, custom, status, department_id, assignee_user_id").eq("agenda_item_id", itemId),
    supabase.from("departments").select("id, name").eq("status", "active"),
    supabase.from("committees").select("kind, committee_members(position, status, person:people(user_id))").eq("status", "active"),
    companyProfile(supabase),
  ]);
  if (!item || !meeting) return;

  const plan = planSync(await wantedRequirements(supabase, item.title, await meetingBody(supabase, meetingId)), (rows ?? []) as ReqRow[]);
  if (plan.remove.length) await supabase.from("agenda_item_requirements").delete().in("id", plan.remove);
  if (!plan.insert.length) return;

  type Member = { position: string; status: string; person: { user_id: string | null } | null };
  const committeeUser = (from: ReqFrom) => {
    const members = ((committees ?? []) as unknown as { kind: string; committee_members: Member[] }[])
      .filter((c) => COMMITTEE_KINDS[from]?.includes(c.kind))
      .flatMap((c) => c.committee_members.filter((m) => m.status === "active" && m.person?.user_id));
    // The committee's secretary receives it, else its chair.
    return (members.find((m) => m.position === "secretary") ?? members.find((m) => m.position === "chair"))?.person?.user_id ?? null;
  };
  const target = (r: Req) => {
    if (r.k === "check") return { department_id: null, assignee_user_id: null };
    if (r.from && COMMITTEE_KINDS[r.from]) return { department_id: null, assignee_user_id: committeeUser(r.from) };
    const department = departmentFor(r.from, departments ?? []);
    if (department) return { department_id: department, assignee_user_id: null };
    if (r.from === "secretary" || !r.from) return { department_id: null, assignee_user_id: null };
    return { department_id: item.department_id, assignee_user_id: item.department_id ? null : item.owner_user_id };
  };
  const days = (profile?.invite_days ?? 5) + 2;
  const due = new Date(Date.parse(meeting.starts_at) - days * 86400000).toISOString().slice(0, 10);

  await supabase.from("agenda_item_requirements").insert(
    plan.insert.map((r) => ({
      agenda_item_id: itemId,
      meeting_id: meetingId,
      position: r.position,
      kind: r.k,
      label: r.ar,
      label_en: r.en,
      source: r.from ?? null,
      auto: r.auto ?? null,
      due_date: r.k === "check" ? null : due,
      ...target(r),
    })),
  );
}
