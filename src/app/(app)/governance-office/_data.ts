import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DatedItem = { date: string; kind: string; title: string; meta: string; href: string; time?: string };

type Body = { board: { name: string } | null; committee: { name: string } | null } | null;
const bodyName = (m: Body) => (m?.board ?? m?.committee)?.name ?? "";

/** Open task and document-request deadlines in [from, to), plus meetings when asked. */
export async function datedItems(supabase: Supabase, from: string | null, to: string, withMeetings = false): Promise<DatedItem[]> {
  let tasks = supabase
    .from("resolution_tasks")
    .select("id, title, due_date, resolution_id, department:departments(name), assignee:profiles(full_name)")
    .in("status", ["open", "in_progress"])
    .lt("due_date", to);
  let docs = supabase
    .from("document_requests")
    .select("id, title, due_date, department:departments(name), item:agenda_items(meeting_id)")
    .in("status", ["requested", "returned"])
    .lt("due_date", to);
  if (from) {
    tasks = tasks.gte("due_date", from);
    docs = docs.gte("due_date", from);
  }
  const meetings = withMeetings && from
    ? supabase
        .from("meetings")
        .select("id, title, starts_at, board:boards(name), committee:committees(name)")
        .neq("status", "cancelled")
        .gte("starts_at", `${from}T00:00:00+03:00`)
        .lt("starts_at", `${to}T00:00:00+03:00`)
    : Promise.resolve({ data: [] });
  const [{ data: t }, { data: d }, { data: m }] = await Promise.all([tasks, docs, meetings]);

  const items: DatedItem[] = [];
  for (const row of (t ?? []) as unknown as { id: string; title: string; due_date: string; resolution_id: string; department: { name: string } | null; assignee: { full_name: string } | null }[]) {
    items.push({ date: row.due_date, kind: "مهمة", title: row.title, meta: row.department?.name ?? row.assignee?.full_name ?? "", href: `/resolutions/${row.resolution_id}` });
  }
  for (const row of (d ?? []) as unknown as { id: string; title: string; due_date: string; department: { name: string } | null; item: { meeting_id: string } | null }[]) {
    if (row.item) items.push({ date: row.due_date, kind: "مستند مطلوب", title: row.title, meta: row.department?.name ?? "", href: `/meetings/${row.item.meeting_id}?tab=agenda` });
  }
  for (const row of (m ?? []) as unknown as ({ id: string; title: string; starts_at: string } & NonNullable<Body>)[]) {
    const local = new Date(new Date(row.starts_at).getTime() + 3 * 3600000).toISOString();
    items.push({ date: local.slice(0, 10), time: local.slice(11, 16), kind: "اجتماع", title: row.title, meta: bodyName(row), href: `/meetings/${row.id}` });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

export { bodyName, type Supabase };
