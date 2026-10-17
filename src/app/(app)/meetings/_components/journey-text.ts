import { CalendarClock, CalendarX, Clock, FileText, Landmark, ListChecks, PenLine, Send, Timer, UserCog, UserX, Users, type LucideIcon } from "lucide-react";
import type { Check } from "@/lib/journey";

// Wording for the meeting journey card: what each stage is for, and each open check as a problem, its fix and a short tile.

/** What each stage is for, under its name. */
export const STAGE_NOTES: Record<number, string> = { 1: "إعداد الأجندة والمستندات", 2: "إصدار الدعوة وإرسالها", 3: "تنفيذ الاجتماع", 4: "تسجيل المحضر والاعتماد" };

/**
 * The summary names what is wrong and what to do, since a check's label reads as the
 * condition to meet («المستندات مسلّمة»), which sounds done when listed as a warning.
 */
export const PROBLEM: Record<string, [string, string]> = {
  details: ["بيانات الاجتماع ناقصة", "أكمل التاريخ والوقت والمكان أو الرابط في «بيانات الاجتماع»"],
  term: ["دورة المجلس لا تغطي تاريخ الاجتماع", "حدّث دورة المجلس أو غيّر الموعد"],
  secretary: ["لم يُعيَّن أمين سر للمجلس", "عيّنه من ملف الشركة"],
  items: ["جدول الأعمال فارغ", "أضف بنداً واحداً على الأقل"],
  definite: ["عنوان بند فيه خيارات «/» أو فراغ «(…)»", "اختر صيغة واحدة وأكمل الفراغ في العنوان"],
  owners: ["بند قرار بلا مسؤول، أو متطلب بلا جهة", "حدّد المسؤول أو جهة كل متطلب داخل البند"],
  "requirements-sent": ["متطلبات محفوظة ولم تُرسل لأحد", "راجعها وأرسلها لجهاتها"],
  "requirements-checks": ["تحققات مطلوبة لم تُؤكَّد بعد", "أكّدها في متطلبات البند"],
  docs: ["مستندات مطلوبة لم تُسلَّم أو لم تُعتمد بعد", "تابعها مع الجهات، أو تجاوز التنبيه بذكر السبب"],
  periods: ["البند يعتمد فترة لم تنتهِ قبل موعد الاجتماع", "صحّح السنة أو الفترة في عنوان البند"],
  "item-dates": ["تاريخ في عنوان البند لا يتسق مع موعد الاجتماع", "صحّح التاريخ في عنوان البند"],
  "requirements-due": ["مواعيد تسليم فاتت أو تقع بعد الاجتماع", "اضبطها على موعد قبل الاجتماع"],
  "notice-time": ["الوقت المتبقي أقل من مهلة الدعوة النظامية", "أخّر الموعد أو تجاوز بذكر السبب"],
  "title-year": ["سنة في عنوان الاجتماع لا تطابق تاريخه", "صحّح السنة في العنوان"],
  "quorum-possible": ["المدعوون أقل من النصاب المطلوب", "ادعُ بقية الأعضاء من تبويب «المدعوون»"],
  scheduled: ["موعد الاجتماع لم يُعتمد بعد", "اعتمد الموعد"],
  pack: ["حزمة المجلس لم تُنشر للأعضاء", "انشر الحزمة"],
  notice: ["الحزمة نُشرت متأخرة عن المهلة النظامية", "تجاوز بذكر السبب إن كان مبرراً"],
  held: ["الاجتماع لم يُعقد أو لم يُنهَ بعد", "افتح تبويب «الانعقاد»"],
  minutes: ["المحضر لم يُعدّ بعد", "ابدأ المحضر"],
  "minutes-complete": ["المحضر ناقص", "أكمل الحد الأدنى والأصوات والتوقيع"],
  approved: ["المحضر لم يُوقَّع ولم يُعتمد", "أرسله للتوقيع"],
  circulars: ["قرارات بالتمرير لم تُثبت في محضر", "أثبتها في هذا الاجتماع"],
};

/** A short "where" for a check in the summary: the items it touches (in order), or its detail when brief. */
export function summaryOf(c: Check): string | null {
  const n = c.fix?.targets?.length ?? 0;
  if (n) {
    const nums = c.fix!.targets!.flatMap((t) => (t.n ? [t.n] : [])).sort((a, b) => a - b);
    return nums.length === n ? `${n === 1 ? "البند" : "البنود"} ${nums.join("، ")}` : n === 1 ? "في بند واحد" : n === 2 ? "في بندين" : `في ${n} بنود`;
  }
  return c.detail && c.detail.length <= 60 ? c.detail : null;
}

/** The tile for an open check in the card: a short name and an icon. */
export const TILE: Record<string, [string, LucideIcon]> = {
  details: ["بيانات ناقصة", CalendarClock],
  term: ["دورة المجلس", Landmark],
  secretary: ["أمين السر", UserCog],
  items: ["جدول فارغ", ListChecks],
  definite: ["عنوان غير محدد", PenLine],
  owners: ["بلا مسؤول", UserX],
  "requirements-sent": ["طلبات لم تُرسل", Send],
  "requirements-checks": ["تحقق معلّق", ListChecks],
  docs: ["مستندات بانتظار", FileText],
  periods: ["فترة لم تنتهِ", CalendarX],
  "item-dates": ["تاريخ غير متسق", CalendarClock],
  "requirements-due": ["مواعيد خارج المدة", Clock],
  "notice-time": ["مهلة الدعوة", Timer],
  "title-year": ["سنة العنوان", PenLine],
  "quorum-possible": ["النصاب", Users],
};

/** How many things a check counts: the items it touches, or one for a meeting-wide check. */
export const tileCount = (c: Check) => c.fix?.targets?.length || 1;
