// Labels and pure rules for meeting preparation.

export const MEETING_TYPES = { regular: "عادي", extraordinary: "استثنائي" } as const;
export const MEETING_MODES = { in_person: "حضوري", virtual: "عن بُعد", hybrid: "مدمج" } as const;
export const MEETING_STATUS = { draft: "مسودة", scheduled: "مُجدول", cancelled: "ملغى" } as const;
export const RSVP = { pending: "لم يرد", accepted: "سيحضر", declined: "معتذر", tentative: "غير مؤكد" } as const;
export const ITEM_KINDS = { information: "للعلم", discussion: "للمناقشة", decision: "للقرار" } as const;
export const REQUEST_STATUS = { pending: "بانتظار المراجعة", accepted: "مقبول", rejected: "مرفوض" } as const;
export const DOC_REQUEST_STATUS = {
  requested: "مطلوب",
  submitted: "مُسلَّم",
  accepted: "معتمد",
  returned: "مُعاد للتعديل",
} as const;

export type MeetingStatus = keyof typeof MEETING_STATUS;
export type DocRequestStatus = keyof typeof DOC_REQUEST_STATUS;

/** Combines a date and a time typed in Riyadh into an ISO timestamp (Saudi Arabia has no DST). */
export function riyadhTimestamp(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/** Splits a timestamp into the Riyadh date and time used by form inputs. */
export function riyadhParts(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** "اجتماع المجلس رقم 3 لعام 2026" style reference. */
/** The meeting's number as issued (e.g. BD-2026-001); drafts are numbered when their invitation is issued. */
export function meetingReference(code: string | null): string {
  return code ?? "مسودة (يُرقَّم عند إصدار الدعوة)";
}

export type NumberingFormat = { separator: string; digits: number; withYear: boolean };

/** The code the database writes when an invitation is issued, for previews: BD-2026-001. */
export function meetingCode(body: string, year: number, number: number, f: NumberingFormat): string {
  return [body, ...(f.withYear ? [String(year)] : []), String(number).padStart(f.digits, "0")].join(f.separator);
}

export function totalMinutes(items: { duration_minutes: number | null }[]): number {
  return items.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0);
}

/** New positions after moving one agenda item up or down; unchanged at the edges. */
export function moveItem<T extends { id: string; position: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): { id: string; position: number }[] {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sorted.length) return [];
  [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
  return sorted.map((item, i) => ({ id: item.id, position: i + 1 }));
}

export function rsvpSummary(invitees: { rsvp: string }[]) {
  const counts = { accepted: 0, declined: 0, tentative: 0, pending: 0 };
  for (const { rsvp } of invitees) if (rsvp in counts) counts[rsvp as keyof typeof counts]++;
  return counts;
}

/** Storage path for an upload: "<meeting>/<random>-<safe file name>". */
export function storagePath(meetingId: string, fileName: string, random: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return `${meetingId}/${random}${ext ? `.${ext}` : ""}`;
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
