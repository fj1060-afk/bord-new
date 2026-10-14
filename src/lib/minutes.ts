// Labels and pure rules for minutes, resolutions and follow-up tasks.

export const MINUTES_STATUS = { draft: "مسودة", review: "بانتظار التوقيع", approved: "معتمد" } as const;
export const RESOLUTION_STATUS = { approved: "معتمد", rejected: "مرفوض", deferred: "مؤجل" } as const;
export const TASK_STATUS = { open: "لم تبدأ", in_progress: "قيد التنفيذ", done: "منجزة", cancelled: "ملغاة" } as const;

export type MinutesStatus = keyof typeof MINUTES_STATUS;
export type TaskStatus = keyof typeof TASK_STATUS;

/** "3/2026": resolution number and the year it was numbered in. */
export function resolutionReference(number: number | null, year: number | null): string {
  return `${number ?? "—"}/${year ?? "—"}`;
}

/** Open or in-progress tasks past their due date (dates compared as Riyadh YYYY-MM-DD). */
export function isOverdue(dueDate: string | null, status: string, today: string): boolean {
  return Boolean(dueDate) && (status === "open" || status === "in_progress") && dueDate! < today;
}

export function riyadhToday(now = new Date()): string {
  return new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Opening paragraph proposed for a new set of minutes; the secretary can edit it. */
export function defaultIntro(input: {
  body: string;
  reference: string;
  date: string;
  time: string;
  location: string | null;
  attendees: number;
  members: number;
}): string {
  const place = input.location ? ` في ${input.location}` : "";
  return `عقد ${input.body} اجتماعه ${input.reference} يوم ${input.date} الساعة ${input.time}${place}، بحضور ${input.attendees} من أصل ${input.members} أعضاء، وبذلك اكتمل النصاب النظامي للاجتماع.`;
}

export function signatureProgress(signers: { person_id: string }[], signed: { person_id: string }[]) {
  const done = new Set(signed.map((s) => s.person_id));
  const remaining = signers.filter((s) => !done.has(s.person_id));
  return { total: signers.length, signed: signers.length - remaining.length, remaining };
}
