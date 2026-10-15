// Rule-based review of an agenda item against the Companies Law, the
// governance regulations and members' conflict-of-interest disclosures.
// Advisory only: findings never block the meeting journey.

import { withPhraseFixes } from "./spelling";

/** `fixes` are complete replacement titles the author can apply with one click. */
export type Finding = { level: "warn" | "tip"; text: string; ref?: string; fixes?: string[] };
export type ItemDraft = { title: string; description?: string | null; kind: string };
export type Disclosure = { name: string; details: string | null };

/** Arabic text folded for matching: no diacritics or tatweel, one alef, ta marbuta as ha, alef maqsura as ya. */
export function fold(s: string) {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(fold(w)));

const STOP = new Set(["شركه", "الشركه", "مؤسسه", "عضو", "مجلس", "اداره", "الاداره", "لدي", "لدى", "يوجد", "ملكيه", "نسبه", "حصه", "مساهم", "شريك", "مالك", "رئيس", "مدير", "عقد", "تعامل", "مصلحه", "المحدوده", "القابضه", "التجاريه", "للتجاره", "والتجاره"].map(fold));

/** Distinctive words in a disclosure (names of companies, brands, places) that may show up in an item. */
function keywords(details: string) {
  return details
    .split(/[^\p{L}\p{N}\u064B-\u0652]+/u)
    .map((word) => ({ word, key: fold(word).replace(/^(وال|بال|لل|ال|و)/, "") }))
    .filter(({ key }) => key.length >= 4 && !STOP.has(key) && !STOP.has("ال" + key));
}

const RULES: { when: string[]; finding: Finding }[] = [
  {
    when: ["عقد", "تعاقد", "صفقه", "اطراف ذات علاقه", "طرف ذي علاقه", "توريد", "ترسيه", "مناقصه", "شراء", "استئجار", "ايجار"],
    finding: { level: "warn", text: "إن كان لعضو مصلحة مباشرة أو غير مباشرة في هذا التعامل فعليه إبلاغ المجلس والامتناع عن التصويت، ويُثبت ذلك في المحضر ويُبلّغ للجمعية العامة.", ref: "نظام الشركات م71" },
  },
  {
    when: ["منافسه", "منافس", "ينافس", "نشاط مماثل"],
    finding: { level: "warn", text: "اشتراك العضو في عمل ينافس الشركة يحتاج ترخيصاً من الجمعية العامة، ويمتنع العضو المعني عن التصويت.", ref: "نظام الشركات م72" },
  },
  {
    when: ["قرض", "ضمان قرض", "كفاله"],
    finding: { level: "warn", text: "لا يجوز للشركة تقديم قرض نقدي لأعضاء مجلس إدارتها أو ضمان قرض يعقده أحدهم مع الغير (عدا الاستثناءات النظامية).", ref: "نظام الشركات" },
  },
  {
    when: ["تعديل النظام الاساس", "زياده راس المال", "تخفيض راس المال", "حل الشركه", "تصفيه الشركه", "اندماج", "تحول الشركه", "مكافاه اعضاء المجلس", "مكافات اعضاء المجلس", "تعيين مراجع الحسابات", "تعيين المراجع الخارجي", "عزل عضو"],
    finding: { level: "warn", text: "هذا من اختصاص الجمعية العامة؛ صُغ البند توصيةً للجمعية لا قراراً نهائياً من المجلس.", ref: "نظام الشركات (اختصاصات الجمعية العامة)" },
  },
  {
    when: ["توزيع ارباح", "توزيع الارباح"],
    finding: { level: "tip", text: "توزيع الأرباح المرحلية من المجلس يحتاج تفويضاً سارياً من الجمعية العامة؛ وإلا فالبند توصية للجمعية.", ref: "نظام الشركات" },
  },
  {
    when: ["القوائم الماليه", "البيانات الماليه"],
    finding: { level: "tip", text: "أرفق تقرير مراجع الحسابات وتوصية لجنة المراجعة قبل عرض القوائم المالية.", ref: "لائحة الحوكمة (لجنة المراجعة)" },
  },
];

const DECISION_VERBS = ["اعتماد", "الموافقه", "الموافقه علي", "تعيين", "اقرار", "التوصيه", "ترشيح", "تشكيل", "تفويض", "المصادقه", "منح", "انهاء", "تجديد", "اختيار", "انتخاب", "تحديد", "صرف", "الغاء", "تعديل", "اصدار"];

// Items about a financial or reporting period must name it (year, quarter or period end).
const PERIODIC = ["القوائم الماليه", "البيانات الماليه", "الميزانيه", "الموازنه", "الحسابات الختاميه", "التقرير السنوي", "تقرير مجلس الاداره", "الخطه السنويه", "توزيع الارباح", "الارباح المرحليه", "النتائج الماليه"];
const PERIOD = /(\d{4}|[٠-٩]{4}|الربع|ربع|النصف|السنه الماليه المنتهيه|الفتره المنتهيه|المنتهيه في)/;
// A title ending in a preposition or "year of" was cut short.
const DANGLING = /(?:^|\s)(لعام|عام|لسنه|سنه|للعام|للسنه|عن|علي|في|من|الي|ل|و|حتي|بشان|المنتهيه)\s*$/;

// The same trailing "year of" words, as typed, so they can be cut from the suggestion.
const YEAR_WORD = /\s*(لعام|عام|للعام|لسن[ةه]|سن[ةه]|للسن[ةه])\s*$/;

/** `year` is the last completed financial year, used in suggested titles. */
export function reviewItem(item: ItemDraft, disclosures: Disclosure[] = [], year = new Date().getFullYear() - 1): Finding[] {
  const text = fold(withPhraseFixes(`${item.title} ${item.description ?? ""}`));
  const base = withPhraseFixes(item.title.trim());
  const title = fold(base);
  const verbless = item.kind === "decision" && !DECISION_VERBS.some((v) => title.startsWith(fold(v)));
  const verb = verbless ? "اعتماد " : "";
  const fullPeriod = `للسنة المالية المنتهية في 31 ديسمبر ${year}`;
  const findings: Finding[] = [];
  if (DANGLING.test(title)) {
    const yearWord = YEAR_WORD.test(base);
    findings.push({
      level: "warn",
      text: "عنوان البند يبدو ناقصاً؛ اختر صيغة مكتملة أو أكمله يدوياً.",
      fixes: yearWord ? [`${verb}${base} ${year}`, `${verb}${base.replace(YEAR_WORD, "")} ${fullPeriod}`] : undefined,
    });
  } else if (has(text, PERIODIC) && !PERIOD.test(text)) {
    findings.push({ level: "warn", text: "حدّد الفترة التي يخصها البند (السنة أو الربع أو تاريخ نهاية الفترة).", fixes: [`${verb}${base} ${fullPeriod}`, `${verb}${base} لعام ${year}`] });
  }
  for (const d of disclosures) {
    const hit = keywords(d.details ?? "").find(({ key }) => text.includes(key));
    if (hit) findings.push({ level: "warn", text: `تعارض مصالح محتمل: ${d.name} أفصح عن مصلحة تتصل بـ«${hit.word}». يُبلّغ المجلس ويمتنع عن المداولة والتصويت، ويُثبت ذلك في المحضر.`, ref: "نظام الشركات م71" });
  }
  for (const r of RULES) if (has(text, r.when)) findings.push(r.finding);
  if (item.kind === "decision") {
    // The completed-title suggestions above already start with a verb.
    if (verbless && !findings.some((f) => f.fixes)) findings.push({ level: "tip", text: "صُغ بند القرار بفعل واضح.", fixes: [`اعتماد ${base}`, `الموافقة على ${base}`] });
    if (!item.description?.trim()) findings.push({ level: "tip", text: "أضف وصفاً يبيّن المطلوب من المجلس وأثر القرار." });
  }
  return findings;
}
