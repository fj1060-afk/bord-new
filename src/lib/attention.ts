// One shape for everything that needs someone's attention, whatever page it
// comes from: a meeting's unmet journey check, a late document, a broken
// governance rule, an unsigned minute. The dashboard lists them together.

export type Sev = "block" | "warn" | "tip";
export const SEVERITY: Record<Sev, string> = { block: "مانع", warn: "تنبيه", tip: "تذكير" };
export type AttentionIcon = "send" | "users" | "file" | "shield" | "person" | "gavel" | "calendar" | "pen" | "clock" | "chart" | "alert";

export type Attention = {
  id: string;
  sev: Sev;
  icon: AttentionIcon;
  what: string;
  where: string;
  who: string;
  /** Days until it is due (negative when late); null when it has no date. */
  days: number | null;
  ref?: string;
  href: string;
  /** What the link does, shown on the button. */
  action: string;
  /** "board", "committee:<id>" or "company": for filtering by body. */
  body: string;
  bodyName: string;
  /** The viewer's own to do (their signature, document, disclosure). */
  mine?: boolean;
};

const ORDER: Record<Sev, number> = { block: 0, warn: 1, tip: 2 };

/** Most severe first, then the latest or nearest, then undated. */
export function sortAttention(list: Attention[]): Attention[] {
  return [...list].sort((a, b) => ORDER[a.sev] - ORDER[b.sev] || (a.days ?? 1e6) - (b.days ?? 1e6));
}

/** "اليوم", "تأخر 3 أيام", "خلال يومين" … */
export function dueText(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "اليوم";
  const n = Math.abs(days);
  const span = n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوماً`;
  return days < 0 ? `تأخر ${span}` : `خلال ${span}`;
}

/** Whole days from `today` (YYYY-MM-DD) to a date or timestamp, in Riyadh time. */
export function daysUntil(today: string, when: string): number {
  const day = when.length > 10 ? new Date(new Date(when).getTime() + 3 * 3600000).toISOString().slice(0, 10) : when;
  return Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

/** Late or due within a week is a warning at least; due within two days and blocking stays blocking. */
export function sevByDue(base: Sev, days: number | null): Sev {
  if (base === "block" || days === null) return base;
  if (days < 0) return "block";
  if (days <= 7) return "warn";
  return base;
}
