// Pure helpers for the governance and director offices.

export const INCOMING_STATUS = { new: "جديد", in_progress: "قيد المعالجة", closed: "مغلق" } as const;
export const OUTGOING_STATUS = { draft: "مسودة", sent: "مُرسل", closed: "مغلق" } as const;

export function statusLabel(direction: string, status: string): string {
  const labels: Record<string, string> = direction === "incoming" ? INCOMING_STATUS : OUTGOING_STATUS;
  return labels[status] ?? status;
}

/** "2026-10" → its first day and the first day of the next month; invalid input falls back to `today`'s month. */
export function monthRange(value: string | undefined, today: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  const [year, month] = match && +match[2] >= 1 && +match[2] <= 12 ? [+match[1], +match[2]] : [+today.slice(0, 4), +today.slice(5, 7)];
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const next = month === 12 ? key(year + 1, 1) : key(year, month + 1);
  const prev = month === 1 ? key(year - 1, 12) : key(year, month - 1);
  return { year, month, key: key(year, month), first: `${key(year, month)}-01`, next: `${next}-01`, nextKey: next, prevKey: prev };
}

/** Weeks of a month, Sunday first, as ISO dates; days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DeadlineBucket = "overdue" | "week" | "later";
export const DEADLINE_BUCKETS: Record<DeadlineBucket, string> = { overdue: "متأخرة", week: "خلال 7 أيام", later: "لاحقاً" };

export function deadlineBucket(due: string, today: string): DeadlineBucket {
  if (due < today) return "overdue";
  return due <= addDays(today, 7) ? "week" : "later";
}

export type BodyMeeting = { body: string; ended: boolean; upcoming: boolean };
export type BodyTask = { body: string; status: string; due_date: string | null };

/** Per board or committee: meetings held and upcoming, resolutions, and task implementation. */
export function bodyReport(meetings: BodyMeeting[], resolutions: { body: string }[], tasks: BodyTask[], today: string) {
  const rows = new Map<string, { held: number; upcoming: number; resolutions: number; tasks: number; done: number; overdue: number }>();
  const row = (body: string) => rows.get(body) ?? rows.set(body, { held: 0, upcoming: 0, resolutions: 0, tasks: 0, done: 0, overdue: 0 }).get(body)!;
  for (const m of meetings) {
    if (m.ended) row(m.body).held++;
    else if (m.upcoming) row(m.body).upcoming++;
  }
  for (const r of resolutions) row(r.body).resolutions++;
  for (const t of tasks) {
    if (t.status === "cancelled") continue;
    const r = row(t.body);
    r.tasks++;
    if (t.status === "done") r.done++;
    else if (t.due_date && t.due_date < today) r.overdue++;
  }
  return [...rows.entries()]
    .map(([body, r]) => ({ body, ...r, percent: r.tasks ? Math.round((r.done / r.tasks) * 100) : null }))
    .sort((a, b) => a.body.localeCompare(b.body, "ar"));
}
