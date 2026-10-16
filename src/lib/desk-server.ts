import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attention } from "./attention";
import { collectAttention, type PipelineRow } from "./attention-server";
import type { Viewer } from "./auth";
import { score } from "./compliance";
import { complianceFindings } from "./compliance-server";
import { formatGregorianDate } from "./format";
import { riyadhToday } from "./minutes";
import { currentYear } from "./org";
import { can, LEVELS } from "./permissions";

export type Tile = { key: string; label: string; value: string; note: string; alert?: boolean; icon: Attention["icon"]; open: { kind: "filter"; filter: string } | { kind: "link"; href: string } | { kind: "panel"; panel: string } };
export type ComplianceSlice = { status: "ok" | "warning" | "violation"; label: string; rules: { title: string; ref: string; href: string }[] };
export type BodyBar = { name: string; href: string; done: number; open: number; late: number; lateTasks: { title: string; who: string; href: string }[] };
export type AttendancePoint = { id: string; label: string; date: string; rate: number; absent: string[] };
export type Desk = {
  role: string;
  items: Attention[];
  pipeline: PipelineRow[];
  tiles: Tile[];
  compliance: { percent: number | null; slices: ComplianceSlice[] } | null;
  bars: BodyBar[] | null;
  attendance: AttendancePoint[] | null;
};

/** Who the viewer is, for the greeting: their seat if they hold one, else what they do in the system. */
async function roleOf(supabase: SupabaseClient, viewer: Viewer, delegate: boolean): Promise<string> {
  const p = viewer.permissions;
  if (viewer.personId) {
    const [{ data: seat }, { data: chairs }] = await Promise.all([
      supabase.from("board_members").select("position").eq("person_id", viewer.personId).eq("status", "active").maybeSingle(),
      supabase.from("committee_members").select("position, committee:committees(name)").eq("person_id", viewer.personId).eq("status", "active").eq("position", "chair"),
    ]);
    if (seat?.position === "chair") return "رئيس مجلس الإدارة";
    const chair = (chairs ?? [])[0] as unknown as { committee: { name: string } } | undefined;
    if (chair) return `رئيس ${chair.committee.name}`;
    if (seat?.position === "vice_chair") return "نائب رئيس مجلس الإدارة";
    if (seat) return "عضو مجلس الإدارة";
  }
  if (can(p, "/meetings", LEVELS.edit)) return "أمانة سر المجلس";
  if (delegate) return "مندوب إدارة";
  return "مستخدم";
}

/** Everything the personal dashboard shows, scoped to what the viewer may see. */
export async function loadDesk(supabase: SupabaseClient, viewer: Viewer): Promise<Desk> {
  const p = viewer.permissions;
  const today = riyadhToday();
  const year = currentYear();
  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const [{ items, pipeline }, role, findings, { data: tasks }, { data: held }] = await Promise.all([
    collectAttention(supabase, viewer),
    roleOf(supabase, viewer, (delegations ?? []).length > 0),
    can(p, "/governance-office") ? complianceFindings(supabase) : Promise.resolve(null),
    can(p, "/resolutions")
      ? supabase.from("resolution_tasks").select("title, status, due_date, department:departments(name), resolution:resolutions!inner(id, meeting:meetings!inner(board_id, committee_id, committee:committees(name)))").neq("status", "cancelled")
      : Promise.resolve({ data: null }),
    can(p, "/board")
      ? supabase.from("meetings").select("id, title, starts_at").not("board_id", "is", null).eq("live_status", "ended").gte("starts_at", `${year}-01-01T00:00:00+03:00`).order("starts_at")
      : Promise.resolve({ data: null }),
  ]);

  // Compliance by status, with the rules behind each slice.
  const compliance = findings && {
    percent: score(findings),
    slices: (["ok", "warning", "violation"] as const).map((status) => ({
      status,
      label: status === "ok" ? "ملتزم" : status === "warning" ? "تنبيه" : "مخالفة",
      rules: findings.filter((f) => f.status === status).map((f) => ({ title: f.title, ref: f.article, href: f.href })),
    })),
  };

  // Resolution follow-up by body.
  let bars: BodyBar[] | null = null;
  if (tasks) {
    const by = new Map<string, BodyBar>();
    for (const t of tasks as unknown as { title: string; status: string; due_date: string | null; department: { name: string } | null; resolution: { id: string; meeting: { board_id: string | null; committee_id: string | null; committee: { name: string } | null } } }[]) {
      const m = t.resolution.meeting;
      const key = m.board_id ? "board" : `c:${m.committee_id}`;
      const bar = by.get(key) ?? { name: m.board_id ? "مجلس الإدارة" : (m.committee?.name ?? "لجنة"), href: m.board_id ? "/board/resolutions" : `/committees/${m.committee_id}/resolutions`, done: 0, open: 0, late: 0, lateTasks: [] };
      if (t.status === "done") bar.done++;
      else if (t.due_date && t.due_date < today) {
        bar.late++;
        bar.lateTasks.push({ title: t.title, who: t.department?.name ?? "", href: `/resolutions/${t.resolution.id}` });
      } else bar.open++;
      by.set(key, bar);
    }
    bars = [...by.values()].sort((a, b) => (a.name === "مجلس الإدارة" ? -1 : b.name === "مجلس الإدارة" ? 1 : a.name.localeCompare(b.name, "ar")));
  }

  // Board attendance this year, meeting by meeting.
  let attendance: AttendancePoint[] | null = null;
  if (held?.length) {
    const ids = held.map((m) => m.id);
    const [{ data: invitees }, { data: marks }] = await Promise.all([
      supabase.from("meeting_invitees").select("meeting_id, person_id, person:people(full_name)").in("meeting_id", ids).eq("kind", "member"),
      supabase.from("meeting_attendance").select("meeting_id, person_id, status").in("meeting_id", ids),
    ]);
    const mark = new Map((marks ?? []).map((m) => [`${m.meeting_id}:${m.person_id}`, m.status]));
    const STATUS: Record<string, string> = { proxy: "أناب غيره", excused: "معتذر", absent: "غائب" };
    attendance = held.map((m) => {
      const list = ((invitees ?? []) as unknown as { meeting_id: string; person_id: string; person: { full_name: string } }[]).filter((i) => i.meeting_id === m.id);
      const came = list.filter((i) => ["present", "remote", "proxy"].includes(mark.get(`${m.id}:${i.person_id}`) ?? ""));
      return {
        id: m.id,
        label: new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "short", timeZone: "Asia/Riyadh" }).format(new Date(m.starts_at)),
        date: `${m.title} · ${formatGregorianDate(new Date(m.starts_at))}`,
        rate: list.length ? Math.round((came.length / list.length) * 100) : 0,
        absent: list.filter((i) => !["present", "remote"].includes(mark.get(`${m.id}:${i.person_id}`) ?? "")).map((i) => `${i.person.full_name} · ${STATUS[mark.get(`${m.id}:${i.person_id}`) ?? ""] ?? "لم يُسجّل"}`),
      };
    });
  }

  // Four headline tiles, chosen by what the viewer does.
  const blockers = items.filter((i) => i.sev === "block");
  const mine = items.filter((i) => i.mine);
  const tiles: Tile[] = [
    { key: "urgent", label: "إجراءات عاجلة", value: String(blockers.length), note: blockers.length ? `${blockers.filter((i) => i.mine).length} منها عليك مباشرة` : "لا شيء يمنع العمل الآن", alert: blockers.length > 0, icon: "alert", open: { kind: "filter", filter: "block" } },
  ];
  if (mine.length || !can(p, "/meetings", LEVELS.edit)) tiles.push({ key: "mine", label: "بانتظارك أنت", value: String(mine.length), note: mine.length ? mine.slice(0, 2).map((i) => i.action).join("، ") : "لا شيء عليك الآن", alert: mine.some((i) => i.sev === "block"), icon: "person", open: { kind: "filter", filter: "mine" } });
  if (pipeline.length) {
    const next = pipeline.filter((r) => r.days >= 0).sort((a, b) => a.days - b.days)[0];
    tiles.push({ key: "meetings", label: "اجتماعات قادمة", value: String(pipeline.filter((r) => r.days >= 0).length), note: next ? `الأقرب بعد ${next.days} يوماً · ${next.stuck ? "متعثر" : "على المسار"}` : "لا اجتماعات قريبة", alert: !!next?.stuck, icon: "calendar", open: next ? { kind: "panel", panel: `meeting:${next.id}` } : { kind: "link", href: "/board/meetings" } });
  }
  if (compliance) {
    const v = compliance.slices.find((s) => s.status === "violation")!.rules.length;
    tiles.push({ key: "compliance", label: "نسبة الامتثال", value: compliance.percent === null ? "—" : `${compliance.percent}%`, note: v ? `${v} مخالفات` : "لا مخالفات", alert: v > 0, icon: "shield", open: { kind: "panel", panel: v ? "compliance:violation" : "compliance:ok" } });
  }
  if (bars?.length) {
    const t = bars.reduce((s, b) => ({ done: s.done + b.done, all: s.all + b.done + b.open + b.late, late: s.late + b.late }), { done: 0, all: 0, late: 0 });
    tiles.push({ key: "resolutions", label: "تنفيذ القرارات", value: t.all ? `${Math.round((t.done / t.all) * 100)}%` : "—", note: t.late ? `${t.late} مهام متأخرة` : `${t.all} مهمة`, alert: t.late > 0, icon: "gavel", open: { kind: "panel", panel: "bar:0" } });
  }
  if (attendance?.length) {
    const avg = Math.round(attendance.reduce((s, a) => s + a.rate, 0) / attendance.length);
    tiles.push({ key: "attendance", label: `حضور المجلس ${year}`, value: `${avg}%`, note: `${attendance.length} اجتماعات منعقدة`, icon: "users", open: { kind: "panel", panel: `att:${attendance.length - 1}` } });
  }
  return { role, items, pipeline, tiles: tiles.slice(0, 4), compliance, bars, attendance };
}
