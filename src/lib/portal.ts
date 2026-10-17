// The requests portal for department users: one list of what is asked of them
// (documents for agenda items, tasks from resolutions), with one set of statuses.

/** The portal is on in previews and development, and on the live site only once REQUESTS_PORTAL=on is set there. */
export function portalEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.REQUESTS_PORTAL === "off") return false;
  return env.REQUESTS_PORTAL === "on" || env.VERCEL_ENV !== "production";
}

/** Department users: no organizer or board/committee pages, so they get the portal's three pages. */
export function isPortalUser(allowed: (page: string, level?: number) => boolean): boolean {
  return !allowed("/meetings", 2) && !allowed("/board") && !allowed("/committees");
}

export const STAGES = { new: "جديدة", in_progress: "قيد التنفيذ", answered: "تم الرد", returned: "تحتاج استكمالاً", done: "مكتملة" } as const;
export type Stage = keyof typeof STAGES;

/** A document request's or a task's stored status as the portal shows it. */
export function stageOf(kind: "document" | "task", status: string): Stage | null {
  if (kind === "task") return status === "done" ? "done" : status === "in_progress" ? "in_progress" : status === "open" ? "new" : null;
  return ({ requested: "new", in_progress: "in_progress", submitted: "answered", returned: "returned", accepted: "done" } as Record<string, Stage>)[status] ?? null;
}

/** Overdue is shown apart from the status: past its due date and not yet done. */
export const isLate = (due: string | null, stage: Stage, today: string) => !!due && stage !== "done" && stage !== "answered" && due < today;

/** Whether the request still waits on the department (new, in progress or returned). */
export const needsAction = (stage: Stage) => stage === "new" || stage === "in_progress" || stage === "returned";

export type PortalRow = {
  id: string;
  kind: "document" | "task";
  title: string;
  stage: Stage;
  late: boolean;
  due: string | null;
  /** Where it comes from: the agenda item and meeting, or the resolution. */
  context: string;
  meetingId: string | null;
  meetingTitle: string | null;
  party: string;
  href: string;
  /** Shown when the row is opened on the home page. */
  detail: { item?: string; agendaItemId?: string; meetingDate?: string; note?: string | null; description?: string | null; files: { id: string; title: string }[] };
};

/** Where a request stands against its deadline, as the home page's status column shows it. */
export type Timing = "late" | "today" | "soon" | "later" | "answered" | "done";
export const SOON_DAYS = 7;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

export function timingOf(stage: Stage, due: string | null, today: string): Timing {
  if (stage === "done") return "done";
  if (stage === "answered") return "answered";
  if (!due) return "later";
  const days = daysBetween(today, due);
  return days < 0 ? "late" : days === 0 ? "today" : days <= SOON_DAYS ? "soon" : "later";
}

/** «متأخر 6 أيام», «اليوم», «خلال 3 أيام», … */
export function timingLabel(timing: Timing, due: string | null, today: string): string {
  const n = due ? Math.abs(daysBetween(today, due)) : 0;
  const days = n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوماً`;
  return { late: `متأخر ${days}`, today: "اليوم", soon: `خلال ${days}`, later: "في الموعد", answered: "تم الرد", done: "منجزة" }[timing];
}

/** Counts per tab, plus overdue. */
export function tally(rows: PortalRow[]) {
  const by = (s: Stage) => rows.filter((r) => r.stage === s).length;
  return { all: rows.length, new: by("new"), in_progress: by("in_progress"), answered: by("answered"), returned: by("returned"), done: by("done"), late: rows.filter((r) => r.late).length };
}

/** Most urgent first: overdue, then returned, then by due date (none last). */
export function byUrgency(a: PortalRow, b: PortalRow): number {
  return Number(b.late) - Number(a.late) || Number(b.stage === "returned") - Number(a.stage === "returned") || (a.due ?? "9999").localeCompare(b.due ?? "9999");
}
