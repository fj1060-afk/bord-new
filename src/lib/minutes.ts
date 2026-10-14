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

export type IntroInput = {
  body: string;
  bodyEn: string;
  number: number | null;
  year: string;
  date: string;
  dateEn: string;
  scheduled: string;
  started: string;
  scheduledEn: string;
  startedEn: string;
  location: string | null;
  locationEn: string | null;
  own: number;
  proxies: number;
  members: number;
  quorumMet: boolean;
};

/** Opening paragraph proposed for new minutes (Arabic, English): scheduled vs actual time, attendance in own right vs by proxy. */
export function defaultIntro(i: IntroInput): [string, string] {
  const place = i.location ? ` في ${i.location}` : "";
  const placeEn = i.locationEn ? ` at ${i.locationEn}` : "";
  const proxies = i.proxies ? ` و${i.proxies} بالإنابة` : "";
  const proxiesEn = i.proxies ? ` and ${i.proxies} by proxy` : "";
  return [
    `عقد ${i.body} اجتماعه رقم (${i.number ?? "—"}) لعام ${i.year} يوم ${i.date}${place}، وكان موعده المقرر الساعة ${i.scheduled} وبدأ فعلياً الساعة ${i.started}، بحضور ${i.own} من الأعضاء أصالةً${proxies} من أصل ${i.members} أعضاء، وبذلك ${i.quorumMet ? "اكتمل" : "لم يكتمل"} النصاب النظامي.`,
    `The ${i.bodyEn} held meeting No. ${i.number ?? "—"} of ${i.year} on ${i.dateEn}${placeEn}. It was scheduled for ${i.scheduledEn} and began at ${i.startedEn}, with ${i.own} members attending in their own right${proxiesEn} out of ${i.members}; the quorum was ${i.quorumMet ? "met" : "not met"}.`,
  ];
}

/** Closing paragraph (Arabic, English) that reflects deferred items. */
export function defaultClosing(ended: string, endedEn: string, deferred: number[]): [string, string] {
  if (!deferred.length) return [`وانتهى الاجتماع الساعة ${ended} بعد استكمال مناقشة بنود جدول الأعمال.`, `The meeting closed at ${endedEn} after all agenda items were discussed.`];
  const list = deferred.join("، ");
  return [
    `وانتهى الاجتماع الساعة ${ended} بعد مناقشة بنود جدول الأعمال، عدا ${deferred.length > 1 ? "البنود" : "البند"} (${list}) ${deferred.length > 1 ? "التي أُجّلت" : "الذي أُجّل"}.`,
    `The meeting closed at ${endedEn}. Agenda ${deferred.length > 1 ? "items" : "item"} ${deferred.join(", ")} ${deferred.length > 1 ? "were" : "was"} deferred.`,
  ];
}

export function signatureProgress(signers: { person_id: string }[], signed: { person_id: string }[]) {
  const done = new Set(signed.map((s) => s.person_id));
  const remaining = signers.filter((s) => !done.has(s.person_id));
  return { total: signers.length, signed: signers.length - remaining.length, remaining };
}
