import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "./auth";
import { riyadhToday } from "./minutes";
import { isLate, stageOf, type PortalRow } from "./portal";

type DocRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  department_id: string | null;
  assignee_user_id: string | null;
  department: { name: string } | null;
  item: { position: number; title: string; meeting: { id: string; title: string; starts_at: string } };
};
type TaskRow = { id: string; title: string; due_date: string | null; status: string; department: { name: string } | null; resolution: { id: string; number: number | null; year: number | null } | null };

/**
 * Everything asked of the viewer or their departments: documents for agenda items and
 * tasks from resolutions, each once, in the portal's statuses. RLS limits what is read;
 * the filters keep the viewer's own (organizers would otherwise get every request).
 */
export async function loadPortal(supabase: SupabaseClient, viewer: Viewer): Promise<{ rows: PortalRow[]; departments: { id: string; name: string }[] }> {
  const today = riyadhToday();
  const { data: delegations } = await supabase.from("department_delegates").select("department:departments(id, name)").eq("user_id", viewer.id);
  const departments = (delegations ?? []).flatMap((d) => (d.department ? [d.department as unknown as { id: string; name: string }] : []));
  const ids = departments.map((d) => d.id);
  const mineOr = ids.length ? `assignee_user_id.eq.${viewer.id},department_id.in.(${ids.join(",")})` : `assignee_user_id.eq.${viewer.id}`;

  const [{ data: docs }, { data: tasks }] = await Promise.all([
    supabase
      .from("document_requests")
      .select("id, title, due_date, status, department_id, assignee_user_id, department:departments(name), item:agenda_items!inner(position, title, meeting:meetings!agenda_items_meeting_id_fkey!inner(id, title, starts_at))")
      .or(mineOr)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("resolution_tasks")
      .select("id, title, due_date, status, department:departments(name), resolution:resolutions(id, number, year)")
      .or(mineOr)
      .neq("status", "cancelled"),
  ]);

  const rows: PortalRow[] = [];
  for (const d of (docs ?? []) as unknown as DocRow[]) {
    const stage = stageOf("document", d.status);
    if (!stage) continue;
    rows.push({
      id: d.id,
      kind: "document",
      title: d.title,
      stage,
      late: isLate(d.due_date, stage, today),
      due: d.due_date,
      context: `البند ${d.item.position}: ${d.item.title}`,
      meetingId: d.item.meeting.id,
      meetingTitle: d.item.meeting.title,
      party: d.department?.name ?? (d.assignee_user_id === viewer.id ? "أنت" : "مكلّف بالاسم"),
      href: `/requests/${d.id}`,
    });
  }
  for (const t of (tasks ?? []) as unknown as TaskRow[]) {
    const stage = stageOf("task", t.status);
    if (!stage) continue;
    rows.push({
      id: t.id,
      kind: "task",
      title: t.title,
      stage,
      late: isLate(t.due_date, stage, today),
      due: t.due_date,
      context: t.resolution?.number ? `مهمة من القرار ${t.resolution.number}/${t.resolution.year}` : "مهمة من قرار",
      meetingId: null,
      meetingTitle: null,
      party: t.department?.name ?? "أنت",
      href: t.resolution ? `/resolutions/${t.resolution.id}` : "/my-tasks",
    });
  }
  return { rows, departments };
}
