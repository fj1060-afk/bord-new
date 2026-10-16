// The wording of the emails the secretary sends from Outlook: requests to
// whoever provides an item's requirements, the members' invitation, and the
// pack sent before the meeting within the statutory notice period.

import { formatDateTime } from "./format";

export type MailMeeting = { title: string; body: string; startsAt: string; place: string; url: string; secretary: string };

const sign = (m: MailMeeting) => `مع خالص التحية،\n${m.secretary || "أمين السر"}`;

/** One email per person with everything requested from them for the meeting. */
export function requestsMail(m: MailMeeting, name: string, requests: { item: string; label: string; due: string | null }[], tasksUrl: string) {
  const list = requests.map((r, i) => `${i + 1}. ${r.label}\n   البند: ${r.item}${r.due ? `\n   آخر موعد: ${r.due}` : ""}`).join("\n");
  return {
    subject: `طلب مستندات: ${m.title} (${m.body})`,
    body: `السلام عليكم ورحمة الله ${name}،\n\nنأمل تزويدنا بما يلي لاجتماع ${m.body} المقرر في ${formatDateTime(new Date(m.startsAt))}:\n\n${list}\n\nيمكنكم رفعها مباشرة عبر النظام:\n${tasksUrl}\n\n${sign(m)}`,
  };
}

/** The invitation text: date, place and the numbered agenda. */
export function inviteText(m: MailMeeting, items: string[]) {
  return `يسرّنا دعوتكم لحضور ${m.title} (${m.body})، يوم ${formatDateTime(new Date(m.startsAt))}، ${m.place}.\n\nجدول الأعمال:\n${items.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nتفاصيل الاجتماع ومستنداته:\n${m.url}\n\n${sign(m)}`;
}

/** The pack email: the agenda with each item's supporting documents. */
export function packMail(m: MailMeeting, items: { title: string; documents: string[] }[]) {
  const list = items.map((it, i) => `${i + 1}. ${it.title}${it.documents.length ? `\n   المستندات: ${it.documents.join("، ")}` : ""}`).join("\n");
  return {
    subject: `حزمة ${m.title} (${m.body}): جدول الأعمال والمستندات الداعمة`,
    body: `السلام عليكم ورحمة الله،\n\nنرفق لكم جدول أعمال ${m.title} المقرر في ${formatDateTime(new Date(m.startsAt))}، ${m.place}، والمستندات الداعمة لبنوده:\n\n${list}\n\nالمستندات متاحة في النظام:\n${m.url}\n\n${sign(m)}`,
  };
}

/** The last day to send the pack: the notice period (days) before the meeting, in Riyadh time. */
export function packDeadline(startsAt: string, noticeDays: number) {
  return new Date(Date.parse(startsAt) - noticeDays * 86400000 + 3 * 3600000).toISOString().slice(0, 10);
}
