// Standard agenda item wordings, suggested while the title is typed.

import { fold } from "./item-review";
import { withPhraseFixes } from "./spelling";

type Kind = "information" | "discussion" | "decision";
export type TitleSuggestion = { title: string; kind: Kind };

const QUARTER_ENDS = ["31 مارس", "30 يونيو", "30 سبتمبر", "31 ديسمبر"];

/** Templates for a date: `year` is the last completed financial year, `quarter` the last completed quarter. */
function templates(today: Date): { keys: string[]; title: string; kind: Kind }[] {
  const now = today.getFullYear();
  const year = now - 1;
  const q = Math.floor(today.getMonth() / 3); // completed quarters this year
  const [qYear, qEnd] = q === 0 ? [year, QUARTER_ENDS[3]] : [now, QUARTER_ENDS[q - 1]];
  const fy = `للسنة المالية المنتهية في 31 ديسمبر ${year}`;
  return [
    { keys: ["القوائم المالية", "البيانات المالية", "الحسابات الختامية"], kind: "decision", title: `التصويت على اعتماد القوائم المالية ${fy}` },
    { keys: ["القوائم المالية", "البيانات المالية", "الأولية", "الربعية", "الربع"], kind: "decision", title: `التصويت على اعتماد القوائم المالية الأولية للفترة المنتهية في ${qEnd} ${qYear}` },
    { keys: ["الموازنة", "الميزانية", "التقديرية"], kind: "decision", title: `التصويت على اعتماد الموازنة التقديرية لعام ${now + 1}` },
    { keys: ["تقرير مجلس الإدارة", "التقرير السنوي"], kind: "decision", title: `التصويت على اعتماد تقرير مجلس الإدارة ${fy}` },
    { keys: ["توزيع", "الأرباح", "ارباح"], kind: "decision", title: `التصويت على التوصية للجمعية العامة بتوزيع أرباح نقدية على المساهمين عن السنة المالية المنتهية في 31 ديسمبر ${year}` },
    { keys: ["مراجع الحسابات", "المراجع الخارجي", "مراجع"], kind: "decision", title: `التصويت على التوصية للجمعية العامة بتعيين مراجع الحسابات للسنة المالية ${now + 1} وتحديد أتعابه` },
    { keys: ["الخطة الاستراتيجية", "الاستراتيجية", "استراتيجية"], kind: "decision", title: `التصويت على اعتماد الخطة الاستراتيجية للأعوام ${now + 1}–${now + 3}` },
    { keys: ["المحضر", "محضر", "الاجتماع السابق"], kind: "decision", title: "التصويت على اعتماد محضر الاجتماع السابق" },
    { keys: ["الأطراف ذات العلاقة", "ذات علاقة", "مصلحة", "تعارض"], kind: "decision", title: "التصويت على الأعمال والعقود التي لعضو مجلس الإدارة مصلحة مباشرة أو غير مباشرة فيها" },
    { keys: ["الجمعية العامة", "الجمعية", "دعوة"], kind: "decision", title: "التصويت على دعوة الجمعية العامة للانعقاد واعتماد جدول أعمالها" },
    { keys: ["تشكيل", "لجنة"], kind: "decision", title: "التصويت على تشكيل لجنة … وتحديد مهامها ومدتها" },
    { keys: ["سياسة", "لائحة", "اللائحة"], kind: "decision", title: "التصويت على اعتماد سياسة/لائحة …" },
    { keys: ["تقرير لجنة المراجعة", "لجنة المراجعة"], kind: "information", title: `الاطلاع على تقرير لجنة المراجعة للفترة المنتهية في ${qEnd} ${qYear}` },
    { keys: ["الأداء", "أداء", "مؤشرات"], kind: "discussion", title: `مناقشة تقرير أداء الشركة للفترة المنتهية في ${qEnd} ${qYear}` },
    { keys: ["المخاطر", "مخاطر"], kind: "discussion", title: "مناقشة تقرير إدارة المخاطر" },
    { keys: ["مكافآت", "مكافأة", "المكافآت"], kind: "decision", title: `التصويت على التوصية للجمعية العامة بصرف مكافآت أعضاء مجلس الإدارة عن السنة المالية المنتهية في 31 ديسمبر ${year}` },
  ];
}

/** Up to `limit` standard titles matching what has been typed (spelling slips in known phrases are forgiven). */
export function suggestTitles(input: string, today = new Date(), limit = 3): TitleSuggestion[] {
  const text = fold(withPhraseFixes(input.trim()));
  if (text.length < 3) return [];
  const words = text.split(/\s+/).filter((w) => w.length >= 3);
  return templates(today)
    .map((t) => {
      const keys = t.keys.map(fold);
      const score = keys.filter((k) => text.includes(k)).reduce((n, k) => n + k.length, 0) + (keys.some((k) => k.startsWith(text) || k.includes(text)) ? 1 : 0) + words.filter((w) => fold(t.title).includes(w)).length;
      return { title: t.title, kind: t.kind, score, exact: fold(t.title) === text };
    })
    .filter((t) => t.score > 1 && !t.exact)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ title, kind }) => ({ title, kind }));
}
