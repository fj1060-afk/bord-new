// The meeting journey: four stages, each with checks that gate the next one.
// "block" checks must pass; "warn" checks pass with a written reason
// (an override); "info" never blocks.

import type { CompanyType } from "./company";
import { templateGaps } from "./item-review";
import { dateProblems, periodNotEnded, yearsAhead } from "./item-period";
import { hamzaSlips } from "./spelling";

export const STAGES = [
  { n: 1, title: "التحضير", tabs: ["overview", "agenda", "invitees"] },
  { n: 2, title: "الدعوة", tabs: ["overview", "agenda"] },
  { n: 3, title: "الانعقاد", tabs: ["live"] },
  { n: 4, title: "المحضر والمتابعة", tabs: ["minutes"] },
] as const;

export type Level = "block" | "warn" | "info";
/** Where "أكمِل" leads: another page, or a spot on the meeting page; targets are the items to fix. */
export type Fix = { label: string; href?: string; anchor?: string; targets?: { label: string; anchor: string }[]; /** Shown above the targets instead of the detail. */ note?: string };
export type Check = { id: string; stage: 1 | 2 | 3 | 4; label: string; ok: boolean; level: Level; ref?: string; detail?: string; tab: string; overridden?: string; fix?: Fix };

export type JourneyInput = {
  today: string;
  companyType: CompanyType;
  inviteDays: number;
  isBoard: boolean;
  boardTermEnd: string | null;
  secretary: boolean;
  meeting: { title?: string; status: string; live_status: string; starts_at: string; mode: string; location: string | null; virtual_link: string | null; pack_published_at: string | null; pack_emailed_at?: string | null; meeting_type: string };
  items: { id?: string; title: string; kind: string; owned: boolean }[];
  requests: { title: string; status: string; itemId?: string }[];
  /** Item requirements: drafts or withdrawals not yet sent, and checks not yet confirmed. */
  requirements?: { unsent: number; unchecked: string[]; unsentItems?: string[]; uncheckedItems?: string[]; dues?: { itemId: string; due: string }[] };
  invitedMembers: number;
  quorumNeeded: number;
  minutes: { status: string; gaps: string[] } | null;
  unratifiedCirculars: number;
  resolutionsWithoutTasks: number;
  overrides: Record<string, string>;
};

const day = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600000).toISOString().slice(0, 10);

export function journeyChecks(j: JourneyInput): Check[] {
  const listed = j.companyType === "listed_jsc";
  const jsc = listed || j.companyType === "unlisted_jsc";
  const m = j.meeting;
  const pending = j.requests.filter((r) => r.status !== "accepted");
  const notice = m.pack_published_at ? Math.floor((Date.parse(m.starts_at) - Date.parse(m.pack_published_at)) / 86400000) : null;
  const unowned = j.items.filter((i) => i.kind === "decision" && !i.owned);
  const vague = j.items.filter((i) => templateGaps(i.title).length);
  const meetingDay = day(m.starts_at);
  const unended = j.items.filter((i) => periodNotEnded(i.title, meetingDay));
  const badDues = (j.requirements?.dues ?? []).filter((d) => d.due < j.today || d.due > meetingDay);
  const daysLeft = Math.round((Date.parse(meetingDay) - Date.parse(j.today)) / 86400000);
  const noticeShort = !m.pack_published_at && m.meeting_type !== "extraordinary" && m.status !== "cancelled" && daysLeft < j.inviteDays;
  const titleFix = m.title ? hamzaSlips(m.title) : null;
  const misdated = j.items.filter((i) => dateProblems(i.title, meetingDay).length);
  const aheadYears = m.title ? yearsAhead(m.title, meetingDay) : [];
  const byIds = (ids?: string[]) => j.items.filter((i) => i.id && ids?.includes(i.id));
  const targets = (list: JourneyInput["items"]) => list.filter((i) => i.id).map((i) => ({ label: i.title, anchor: `item-${i.id}` }));
  const checks: Check[] = [
    { id: "details", stage: 1, tab: "overview", label: "بيانات الاجتماع: التاريخ والوقت والمكان أو الرابط", level: "block", ok: !!m.starts_at && (m.mode === "virtual" ? !!m.virtual_link : !!m.location) && (m.mode === "in_person" || !!m.virtual_link), fix: { label: "أكمِل بيانات الاجتماع", anchor: "meeting-details" } },
    ...(j.isBoard ? [{ id: "term", stage: 1 as const, tab: "overview", label: "دورة المجلس سارية في تاريخ الاجتماع", level: (jsc ? "block" : "warn") as Level, ref: "نظام الشركات م68", ok: !!j.boardTermEnd && day(m.starts_at) <= j.boardTermEnd, fix: { label: "حدّث دورة المجلس", href: "/board" } }] : []),
    ...(j.isBoard ? [{ id: "secretary", stage: 1 as const, tab: "overview", label: "أمين سر المجلس معيّن", level: "warn" as Level, ref: "نظام الشركات م78/4", ok: j.secretary, fix: { label: "عيّن أمين السر", href: "/admin/company?tab=secretary" } }] : []),
    { id: "items", stage: 1, tab: "agenda", label: "جدول الأعمال: بند واحد على الأقل", level: "block", ok: j.items.length > 0, detail: `${j.items.length} بند`, fix: { label: "أضف بنداً", anchor: "add-item" } },
    { id: "definite", stage: 1, tab: "agenda", label: "عناوين البنود محددة: لا خيارات «/» ولا فراغات «(…)»", level: "block", ok: vague.length === 0, detail: vague.length ? `تحتاج تحديداً: ${vague.map((i) => i.title).join("، ")}` : undefined, fix: { label: "حدّد العنوان", targets: targets(vague), note: "تحتاج تحديداً:" } },
    { id: "owners", stage: 1, tab: "agenda", label: "كل بند للقرار له مسؤول", level: "block", ok: unowned.length === 0, detail: unowned.length ? `بلا مسؤول: ${unowned.map((i) => i.title).join("، ")}` : undefined, fix: { label: "حدّد المسؤول", targets: targets(unowned), note: "بلا مسؤول:" } },
    { id: "requirements-sent", stage: 1, tab: "agenda", label: "إرسال طلبات متطلبات البنود", level: "block", ok: !j.requirements?.unsent, detail: j.requirements?.unsent ? `${j.requirements.unsent} لم تُرسل بعد` : undefined, fix: { label: "راجع وأرسل", anchor: "send-requirements", targets: targets(byIds(j.requirements?.unsentItems)), note: j.requirements?.unsent ? `${j.requirements.unsent} لم تُرسل بعد، في البنود:` : undefined } },
    { id: "requirements-checks", stage: 1, tab: "agenda", label: "تأكيد التحققات المطلوبة للبنود", level: "warn", ok: !j.requirements?.unchecked.length, detail: j.requirements?.unchecked.length ? `بانتظار: ${j.requirements.unchecked.join("، ")}` : undefined, fix: { label: "أكّد التحقق", targets: targets(byIds(j.requirements?.uncheckedItems)) } },
    { id: "docs", stage: 1, tab: "agenda", label: "المستندات المطلوبة مسلّمة ومعتمدة", level: "warn", ok: pending.length === 0, detail: pending.length ? `بانتظار: ${pending.map((r) => r.title).join("، ")}` : undefined, fix: { label: "راجع المستندات", targets: targets(byIds(pending.map((r) => r.itemId ?? ""))) } },
    { id: "periods", stage: 1, tab: "agenda", label: "فترات البنود منتهية قبل الاجتماع", level: "warn", ok: unended.length === 0, detail: unended.length ? "بنود تعتمد قوائم أو أرباحاً لفترة لم تنتهِ في تاريخ الاجتماع:" : undefined, fix: { label: "صحّح الفترة", targets: targets(unended), note: "بنود تعتمد قوائم أو أرباحاً لفترة لم تنتهِ في تاريخ الاجتماع:" } },
    { id: "item-dates", stage: 1, tab: "agenda", label: "تواريخ البنود متسقة مع الاجتماع وفتراتها", level: "warn", ok: misdated.length === 0, detail: misdated.length ? misdated.map((i) => `«${i.title.slice(0, 40)}…»: ${dateProblems(i.title, meetingDay).join("، ")}`).join(" · ") : undefined, fix: { label: "صحّح التاريخ", targets: targets(misdated), note: misdated.length ? `في البنود: ${misdated.flatMap((i) => dateProblems(i.title, meetingDay)).join("، ")}` : undefined } },
    { id: "requirements-due", stage: 1, tab: "agenda", label: "مواعيد المتطلبات بين اليوم وموعد الاجتماع", level: "warn", ok: badDues.length === 0, detail: badDues.length ? `${badDues.length} متطلب موعده فات أو بعد الاجتماع` : undefined, fix: { label: "عدّل المواعيد", targets: targets(byIds(badDues.map((d) => d.itemId))), note: badDues.length ? `${badDues.length} متطلب موعده فات أو بعد الاجتماع، في البنود:` : undefined } },
    { id: "notice-time", stage: 1, tab: "overview", label: `يتسع الوقت لمهلة الدعوة (${j.inviteDays} أيام)`, level: (listed ? "warn" : "info") as Level, ref: "لائحة الحوكمة م30/ج", ok: !noticeShort, detail: noticeShort ? (daysLeft < 0 ? "موعد الاجتماع مضى ولم تُنشر الحزمة." : `باقي ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"} على الاجتماع ولم تُنشر الحزمة؛ أجّل الموعد أو اجعله اجتماعاً استثنائياً بمبرر.`) : undefined, fix: { label: "عدّل الموعد", anchor: "meeting-details" } },
    { id: "title-year", stage: 1, tab: "overview", label: "سنة عنوان الاجتماع تطابق تاريخه", level: "warn", ok: aheadYears.length === 0, detail: aheadYears.length ? `العنوان يذكر ${aheadYears.join(" و")} والاجتماع في ${meetingDay.slice(0, 4)}؛ ترقيم الاجتماعات بسنة انعقادها.` : undefined, fix: { label: "صحّح العنوان", anchor: "meeting-details" } },
    { id: "title-spelling", stage: 1, tab: "overview", label: "عنوان الاجتماع سليم إملائياً", level: "info", ok: !titleFix?.words.length, detail: titleFix?.words.length ? `المقترح: «${titleFix.fixed}»` : undefined, fix: { label: "صحّح العنوان", anchor: "meeting-details" } },
    { id: "quorum-possible", stage: 1, tab: "invitees", label: "الأعضاء المدعوون يكفون لاكتمال النصاب", level: "block", ref: "نظام الشركات م80/2", ok: j.invitedMembers >= j.quorumNeeded, detail: `مدعوون ${j.invitedMembers}، والنصاب ${j.quorumNeeded}`, fix: { label: "ادعُ الأعضاء" } },
    { id: "scheduled", stage: 2, tab: "overview", label: "اعتماد موعد الاجتماع", level: "block", ok: m.status === "scheduled" },
    { id: "pack", stage: 2, tab: "overview", label: "نشر حزمة المجلس (جدول الأعمال والمستندات) للأعضاء", level: "block", ref: "لائحة الحوكمة م30/ج", ok: !!m.pack_published_at },
    {
      id: "notice",
      stage: 2,
      tab: "overview",
      label: `الدعوة قبل الاجتماع بـ ${j.inviteDays} أيام على الأقل`,
      level: m.meeting_type === "extraordinary" ? "info" : listed ? "warn" : "info",
      ref: "لائحة الحوكمة م30/ج",
      ok: notice !== null && notice >= j.inviteDays,
      detail: notice === null ? "لم تُنشر الحزمة بعد" : `نُشرت قبل ${notice} أيام${m.meeting_type === "extraordinary" ? " (اجتماع استثنائي)" : ""}`,
    },
    { id: "pack-email", stage: 2, tab: "overview", label: `إرسال الحزمة للأعضاء بالبريد قبل الاجتماع بـ ${j.inviteDays} أيام`, level: "info", ref: "لائحة الحوكمة م30", ok: !!m.pack_emailed_at, detail: m.pack_emailed_at ? undefined : "من «المراسلات عبر Outlook» في نظرة عامة" },
    { id: "held", stage: 3, tab: "live", label: "عقد الاجتماع بنصاب مكتمل وإنهاؤه", level: "block", ref: "نظام الشركات م80/2", ok: m.live_status === "ended", detail: m.live_status === "ended" ? undefined : day(m.starts_at) > j.today ? "يُفتح يوم الاجتماع" : "سجّل الحضور وابدأ الاجتماع" },
    { id: "minutes", stage: 4, tab: "minutes", label: "إعداد المحضر", level: "block", ok: !!j.minutes },
    { id: "minutes-complete", stage: 4, tab: "minutes", label: "المحضر مكتمل (الحد الأدنى، والأصوات، والتوقيع)", level: "block", ref: "دليل أمين السر؛ نظام الشركات م83", ok: !!j.minutes && j.minutes.gaps.length === 0, detail: j.minutes?.gaps.join(" ") || undefined },
    { id: "approved", stage: 4, tab: "minutes", label: "توقيع المحضر واعتماده", level: "block", ref: "نظام الشركات م83", ok: j.minutes?.status === "approved" },
    { id: "circulars", stage: 4, tab: "minutes", label: "إثبات القرارات الصادرة بالتمرير", level: "warn", ref: "نظام الشركات م82", ok: j.unratifiedCirculars === 0, detail: j.unratifiedCirculars ? `${j.unratifiedCirculars} قرار بانتظار الإثبات` : undefined },
    { id: "tasks", stage: 4, tab: "minutes", label: "مهام تنفيذ لكل قرار", level: "info", ok: j.resolutionsWithoutTasks === 0, detail: j.resolutionsWithoutTasks ? `${j.resolutionsWithoutTasks} قرار بلا مهام` : undefined },
  ];
  return checks.map((c) => (j.overrides[c.id] && !c.ok ? { ...c, overridden: j.overrides[c.id] } : c));
}

/** A check stands in the way when it must pass and has not (warnings can be overridden with a reason). */
export const blocking = (c: Check) => !c.ok && (c.level === "block" || (c.level === "warn" && !c.overridden));

/** The stage the meeting is in: the first with an unmet check (4 when everything is done). */
export function currentStage(checks: Check[]): 1 | 2 | 3 | 4 {
  for (const n of [1, 2, 3, 4] as const) if (checks.some((c) => c.stage === n && blocking(c))) return n;
  return 4;
}

export const stageDone = (checks: Check[], n: number) => !checks.some((c) => c.stage === n && blocking(c));
