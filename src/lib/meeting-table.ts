/** Shared logic for the meetings table: one state per row, filters read from the URL, and pagination. */

export type MeetingState = "draft" | "scheduled" | "live" | "ended" | "cancelled";

export const MEETING_STATES: Record<MeetingState, string> = {
  draft: "مسودة",
  scheduled: "مُجدول",
  live: "جارٍ",
  ended: "انعقد",
  cancelled: "ملغى",
};

type StateInput = { status: string; live_status: string | null };

/** What a meeting is now: cancellation and the live session win over the planning status. */
export function meetingState(m: StateInput): MeetingState {
  if (m.status === "cancelled") return "cancelled";
  if (m.live_status === "ended") return "ended";
  if (m.live_status === "in_progress" || m.live_status === "paused") return "live";
  return m.status === "draft" ? "draft" : "scheduled";
}

/** Minutes the meeting actually ran once ended, otherwise the planned duration. */
export function meetingMinutes(m: { duration_minutes: number | null; started_at: string | null; ended_at: string | null }): { minutes: number | null; actual: boolean } {
  if (m.started_at && m.ended_at) {
    const minutes = Math.round((Date.parse(m.ended_at) - Date.parse(m.started_at)) / 60000);
    if (minutes >= 0) return { minutes, actual: true };
  }
  return { minutes: m.duration_minutes, actual: false };
}

export const PAGE_SIZES = [10, 20, 50] as const;
export const PERIODS = { upcoming: "القادمة", past: "السابقة", all: "الكل" } as const;
export type Period = keyof typeof PERIODS;

export type TableQuery = { q: string; body: string; state: MeetingState | ""; period: Period; page: number; size: number };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Reads the table's filters from search params, falling back to safe defaults. */
export function readTableQuery(params: Record<string, string | string[] | undefined>): TableQuery {
  const state = one(params.state);
  const period = one(params.show);
  const size = Number(one(params.size));
  const page = Number(one(params.page));
  const body = one(params.body);
  return {
    q: one(params.q).trim().slice(0, 100),
    body: /^(board|committee):[0-9a-f-]{36}$/.test(body) ? body : "",
    state: state in MEETING_STATES ? (state as MeetingState) : "",
    period: period in PERIODS ? (period as Period) : "upcoming",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 20,
  };
}

/** The same query with some fields changed, as a search string; defaults are left out. */
export function tableHref(base: string, query: TableQuery, change: Partial<TableQuery>): string {
  const next = { ...query, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.body) params.set("body", next.body);
  if (next.state) params.set("state", next.state);
  if (next.period !== "upcoming") params.set("show", next.period);
  if (next.size !== 20) params.set("size", String(next.size));
  if (next.page > 1) params.set("page", String(next.page));
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}

/** Page numbers to show, with null for a gap: 1 … 4 5 6 … 10. */
export function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const out: (number | null)[] = [];
  let last = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (p - last > 1) out.push(null);
    out.push(p);
    last = p;
  }
  return out;
}

/** A duration in words: "ساعة"، "ساعتان"، "ساعة ونصف"، "3 ساعات"، "45 دقيقة". */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} دقيقة`;
  const hours = h === 1 ? "ساعة" : h === 2 ? "ساعتان" : h <= 10 ? `${h} ساعات` : `${h} ساعة`;
  if (m === 0) return hours;
  if (m === 30) return `${hours} ونصف`;
  return `${hours} و${m} دقيقة`;
}

/** Days, hours and minutes left until `target`; zero once it has passed. */
export function countdown(target: number, now: number): { days: number; hours: number; minutes: number } {
  const left = Math.max(0, Math.floor((target - now) / 60000));
  return { days: Math.floor(left / 1440), hours: Math.floor((left % 1440) / 60), minutes: left % 60 };
}
