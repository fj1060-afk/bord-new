// Rule-based review of an agenda item against the Companies Law, the
// governance regulations and members' conflict-of-interest disclosures.
// Advisory only: findings never block the meeting journey.

import { affiliationNotices, type Affiliation } from "./affiliations";
import { authorityFindings, type AuthorityTemplate, type Powers } from "./authority";
import { fold } from "./fold";
import { asRecommendation, checkAgainstPowers, committeeRules, POWER_KINDS } from "./committee-powers";
import { withoutRequirements } from "./requirements";
import { withPhraseFixes } from "./spelling";

/** `fixes` are complete replacement titles; `template` marks remarks about unfilled template parts (expected in the library). */
export type Finding = { level: "warn" | "tip"; text: string; ref?: string; fixes?: string[]; template?: true };
export type ItemDraft = { title: string; description?: string | null; kind: string };
export type Disclosure = { name: string; details: string | null };

export { fold };

const has = (text: string, words: string[]) => words.some((w) => text.includes(fold(w)));

const STOP = new Set(["شركه", "الشركه", "مؤسسه", "عضو", "مجلس", "اداره", "الاداره", "لدي", "لدى", "يوجد", "ملكيه", "نسبه", "حصه", "مساهم", "شريك", "مالك", "رئيس", "مدير", "عقد", "تعامل", "مصلحه", "المحدوده", "القابضه", "التجاريه", "للتجاره", "والتجاره"].map(fold));

/** Distinctive words in a disclosure (names of companies, brands, places) that may show up in an item. */
function keywords(details: string) {
  return details
    .split(/[^\p{L}\p{N}\u064B-\u0652]+/u)
    .map((word) => ({ word, key: fold(word).replace(/^(وال|بال|لل|ال|و)/, "") }))
    .filter(({ key }) => key.length >= 4 && !STOP.has(key) && !STOP.has("ال" + key));
}

type Rule = { when: string[]; unless?: string[]; listed?: boolean; finding: Finding };

// References checked against the Companies Law (M/132, 1443H), the CMA Corporate
// Governance Regulations (2023) and the CMA Implementing Regulation for listed
// joint stock companies. `listed` rules apply only to listed companies;
// `unless` skips a rule when the item is already worded correctly.
const RULES: Rule[] = [
  {
    when: ["عقد", "العقود", "تعاقد", "صفقه", "اطراف ذات علاقه", "طرف ذي علاقه", "توريد", "ترسيه", "مناقصه", "شراء", "استئجار", "ايجار", "تعامل"],
    // A company buying back its own shares has no counterparty a member could be interested in.
    unless: ["من اسهمها", "لاسهمها"],
    finding: { level: "warn", text: "إن كان لعضو مصلحة مباشرة أو غير مباشرة: يُفصح فوراً ويُثبت في المحضر، ولا يشارك في المداولة ولا التصويت، ويلزم ترخيص الجمعية العامة مع تقرير خاص من مراجع الحسابات، ويُعرض كل عقد في بند مستقل.", ref: "نظام الشركات م27 وم71 وم96/2؛ لائحة الحوكمة م42" },
  },
  {
    when: ["عقد", "تعاقد", "صفقه", "اطراف ذات علاقه", "طرف ذي علاقه", "تعامل"],
    listed: true,
    finding: { level: "tip", text: "يجوز للمجلس الترخيص بتفويض سنوي من الجمعية إذا قلّ التعامل عن 1% من الإيرادات وعن 10 ملايين ريال وكان من الأعمال الاعتيادية بلا شروط تفضيلية؛ والتعامل مع طرف ذي علاقة بنسبة 1% فأكثر من الإيرادات يُفصح عنه فوراً.", ref: "اللائحة التنفيذية للشركات المدرجة م64؛ قواعد طرح الأوراق المالية م80" },
  },
  {
    when: ["عقد", "اتفاقيه", "ترسيه", "استحواذ", "صفقه", "تسهيلات", "قرض", "تمويل", "رهن", "عقار", "اصول"],
    listed: true,
    finding: { level: "tip", text: "إفصاح فوري لتداول إذا كان: عقداً إيراداته 5% فأكثر من إجمالي الإيرادات، أو شراء/بيع/تأجير/رهن أصل بقيمة 10% فأكثر من صافي الأصول، أو ديناً خارج النشاط المعتاد بقيمة 10% فأكثر من صافي الأصول.", ref: "قواعد طرح الأوراق المالية والالتزامات المستمرة م80" },
  },
  {
    when: ["تسهيلات", "قرض", "قروض", "تمويل", "رهن", "ضمان", "كفاله", "شطب", "ابراء"],
    unless: ["لعضو", "للعضو", "لاعضاء", "من اسهمها", "لاسهمها"],
    finding: { level: "tip", text: "للمجلس عقد القروض ورهن الأصول وإبراء مديني الشركة ما لم يقيّد النظام الأساس أو الجمعية صلاحيته؛ تحقق من جدول الصلاحيات ومن التعهدات المالية القائمة.", ref: "نظام الشركات م74" },
  },
  {
    when: ["منافسه", "منافس", "ينافس", "نشاط مماثل"],
    finding: { level: "warn", text: "اشتراك العضو في عمل ينافس الشركة يحتاج ترخيصاً من الجمعية العامة العادية ويُجدد سنوياً، ولا يصوّت العضو المعني.", ref: "نظام الشركات م27/2؛ لائحة الحوكمة م44" },
  },
  {
    when: ["قرض لعضو", "قرض للعضو", "قرض لاعضاء", "ضمان قرض", "كفاله عضو", "كفاله لعضو"],
    finding: { level: "warn", text: "لا يجوز للشركة إقراض أعضاء مجلس إدارتها أو أقاربهم أو ضمان قروضهم، ويقع العقد باطلاً (عدا البنوك وشركات التمويل وفق شروطها المعتادة وبرامج تحفيز العاملين المعتمدة).", ref: "نظام الشركات م72" },
  },
  {
    when: ["تعديل النظام الاساس", "زياده راس المال", "تخفيض راس المال", "حل الشركه", "تصفيه الشركه", "استمرار الشركه", "اندماج", "انقسام", "شراء اسهم", "شراء الشركه لاسهمها", "اسهم الخزينه"],
    unless: ["توصيه", "الجمعيه العامه غير العاديه", "التابعه"],
    finding: { level: "warn", text: "هذا من اختصاص الجمعية العامة غير العادية؛ صُغ البند توصيةً لها.", ref: "نظام الشركات م85" },
  },
  {
    when: ["زياده راس المال", "تخفيض راس المال", "زياده راس مال", "تخفيض راس مال"],
    unless: ["ريال الي", "التابعه"],
    finding: { level: "warn", text: "حدّد في القرار رأس المال قبل التعديل وبعده وطريقة الزيادة أو التخفيض (أسهم نقدية أو عينية، تحويل ديون، رسملة احتياطي، إلغاء أسهم...)؛ وعند التخفيض لزيادة رأس المال عن الحاجة يُدعى الدائنون للاعتراض قبل الجمعية بـ45 يوماً على الأقل.", ref: "نظام الشركات م126 وم133 وم135" },
  },
  {
    when: ["من اسهمها", "لاسهمها", "شراء اسهم الشركه", "شراء اسهم خزينه"],
    unless: ["بغرض", "لغرض", "سياسه"],
    listed: true,
    finding: { level: "warn", text: "قرار الجمعية غير العادية بشراء الأسهم يحدد غرضه والحد الأقصى لعدد الأسهم وطريقة التمويل، ويفوّض المجلس بإتمامه خلال 18 شهراً على الأكثر، ويحدد مدة الاحتفاظ بأسهم الخزينة.", ref: "اللائحة التنفيذية للشركات المدرجة م17 وم24" },
  },
  {
    when: ["تعيين مراجع الحسابات", "تعيين المراجع الخارجي", "عزل مراجع", "اتعاب مراجع", "مكافاه اعضاء المجلس", "مكافات اعضاء المجلس", "مكافات اعضاء مجلس", "مكافاه اعضاء مجلس", "مكافاه لاعضاء", "مكافات لاعضاء", "مكافاه لعضو", "مكافات للاعضاء", "انتخاب اعضاء", "عزل عضو", "بيع اصول", "انهاء عضويه"],
    unless: ["توصيه", "الجمعيه العامه"],
    finding: { level: "warn", text: "هذا من اختصاص الجمعية العامة العادية؛ صُغ البند توصيةً لها.", ref: "نظام الشركات م87" },
  },
  {
    when: ["تعيين مراجع الحسابات", "تعيين مراجع حسابات", "تعيين المراجع الخارجي"],
    unless: ["اتعاب"],
    finding: { level: "warn", text: "تحدد الجمعية عند تعيين مراجع الحسابات أتعابه ونطاق عمله (القوائم الأولية والسنوية) والفترة التي يغطيها؛ أضفها إلى صيغة البند.", ref: "نظام الشركات م18؛ اللائحة التنفيذية للشركات المدرجة م3" },
  },
  {
    when: ["مراجع الحسابات", "المراجع الخارجي"],
    finding: { level: "tip", text: "يُبنى على توصية لجنة المراجعة بعد التحقق من استقلال المراجع وعروض الأتعاب؛ ولا تتجاوز مدة المراجع في الشركات المدرجة 7 سنوات متتالية.", ref: "لائحة الحوكمة م52؛ اللائحة التنفيذية للشركات المدرجة م3" },
  },
  {
    when: ["مكافاه", "مكافات", "مكافآت"],
    finding: { level: "tip", text: "يلزم توصية لجنة المكافآت وأن تكون المكافأة في حدود النظام الأساس، ولا يصوّت أعضاء المجلس على بند مكافآتهم في الجمعية.", ref: "نظام الشركات م76" },
  },
  {
    when: ["توزيع ارباح", "توزيع الارباح", "ارباح مرحليه", "ارباح نقديه"],
    unless: ["الاحقيه", "سياسه", "تفويض مجلس", "بتفويض"],
    finding: { level: "warn", text: "حدّد في قرار التوزيع تاريخ الأحقية (المساهمون المسجلون بنهاية يوم …) وتاريخ التوزيع؛ وفي الشركات المدرجة يُصرف خلال 15 يوم عمل من تاريخ الأحقية.", ref: "نظام الشركات م125/2؛ لائحة الحوكمة م9؛ اللائحة التنفيذية للشركات المدرجة م46" },
  },
  {
    when: ["ارباح مرحليه", "توزيع مرحلي"],
    finding: { level: "warn", text: "توزيع الأرباح المرحلية من المجلس يحتاج نصاً في النظام الأساس وتفويضاً من الجمعية العامة يُجدد سنوياً، وأرباحاً قابلة للتوزيع وسيولة كافية؛ ويُفصح عن القرار فوراً مع تاريخي الأحقية والصرف.", ref: "نظام الشركات م22؛ اللائحة التنفيذية للشركات المدرجة م47" },
  },
  {
    when: ["توزيع ارباح", "توزيع الارباح"],
    unless: ["مرحلي", "توصيه", "قرار الجمعيه", "اقرتها الجمعيه"],
    finding: { level: "tip", text: "توزيع الأرباح السنوية يكون باقتراح المجلس وقرار الجمعية العامة؛ صُغ البند توصيةً للجمعية.", ref: "نظام الشركات م125" },
  },
  {
    when: ["القوائم الماليه", "البيانات الماليه"],
    unless: ["تعيين مراجع", "مراجع الحسابات من بين"],
    finding: { level: "tip", text: "أرفق توصية لجنة المراجعة وتقرير مراجع الحسابات قبل عرض القوائم على المجلس.", ref: "لائحة الحوكمة م52" },
  },
  {
    when: ["القوائم الماليه", "البيانات الماليه"],
    unless: ["تعيين مراجع", "مراجع الحسابات من بين"],
    listed: true,
    finding: { level: "tip", text: "مواعيد الإفصاح: الأولية خلال 30 يوماً من نهاية الفترة، والسنوية خلال 3 أشهر من نهاية السنة وقبل الجمعية بـ21 يوماً على الأقل.", ref: "قواعد طرح الأوراق المالية والالتزامات المستمرة م81" },
  },
  {
    when: ["تشكيل لجنه المراجعه", "اعضاء لجنه المراجعه", "عضويه لجنه المراجعه", "في لجنه المراجعه", "للجنه المراجعه"],
    unless: ["تقرير لجنه المراجعه"],
    finding: { level: "tip", text: "لجنة المراجعة: لا يكون فيها عضو تنفيذي، ومن أعضائها مختص بالشؤون المالية والمحاسبية، وتجتمع 4 مرات على الأقل سنوياً.", ref: "لائحة الحوكمة م51 وم54" },
  },
  {
    when: ["رئيسا للجنه", "رئيس لجنه", "رئاسه لجنه"],
    finding: { level: "tip", text: "لا يجوز لرئيس مجلس الإدارة رئاسة أي لجنة نظامية ولا عضوية لجنة المراجعة، ويكون رئيس لجنة الترشيحات مستقلاً، ويُستحسن أن يكون رئيس لجنة المراجعة مستقلاً.", ref: "لائحة الحوكمة م48 وم51" },
  },
  {
    when: ["في لجنه", "للجنه", "اعضاء لجنه", "تشكيل لجنه", "تشكيل اللجان", "تعيين اعضاء"],
    unless: ["تقرير"],
    listed: true,
    finding: { level: "tip", text: "عدد أعضاء اللجنة من 3 إلى 5، ولا يرأس رئيس المجلس أي لجنة نظامية، وتُبلَّغ هيئة السوق المالية بأي تعيين أو تغيير في عضوية اللجان خلال 5 أيام.", ref: "لائحة الحوكمة م47 وم48" },
  },
  {
    when: ["انتخاب اعضاء"],
    unless: ["تبدا", "اعتبارا من", "لمده"],
    finding: { level: "tip", text: "حدّد في البند بداية الدورة ونهايتها وفق النظام الأساس (لا تتجاوز 4 سنوات)؛ وفي الشركات المدرجة يكون التصويت تراكمياً.", ref: "نظام الشركات م68؛ اللائحة التنفيذية للشركات المدرجة م5" },
  },
  {
    when: ["مقعد شاغر", "المقعد الشاغر", "عضو بديل", "شغور", "المستقيل", "بدلا من العضو"],
    unless: ["لجنه"],
    finding: { level: "tip", text: "التعيين في المقعد الشاغر مؤقت ويُبلّغ للسجل التجاري (والهيئة إن كانت الشركة مدرجة) خلال 15 يوماً، ويُعرض على أول جمعية عادية.", ref: "نظام الشركات م69" },
  },
  {
    when: ["الخسائر", "خسائر"],
    unless: ["ارباح"],
    finding: { level: "tip", text: "إذا بلغت الخسائر نصف رأس المال المصدر: يُعلن خلال 60 يوماً وتُدعى الجمعية غير العادية خلال 180 يوماً للنظر في الاستمرار أو الحل.", ref: "نظام الشركات م132" },
  },
  {
    when: ["بيع اصول", "بيع الاصول", "التصرف في اصول"],
    finding: { level: "tip", text: "بيع أصول تزيد قيمتها على 50% من إجمالي الأصول (في صفقة أو أكثر خلال 12 شهراً) يحتاج موافقة الجمعية العامة.", ref: "نظام الشركات م75" },
  },
  {
    when: ["سياسه", "لائحه عمل", "ميثاق"],
    finding: { level: "tip", text: "اعتماد السياسات: أرفق المسودة النهائية وجدول مقارنة التعديلات ومبرراتها، وتوصية اللجنة المختصة (المراجعة للسياسات المالية والإفصاح وتعارض المصالح والإبلاغ عن المخالفات؛ الترشيحات والمكافآت لسياسات المكافآت والعضوية؛ المخاطر لسياسة المخاطر)، والمراجعة القانونية، وحدد مالك السياسة وموعد مراجعتها القادمة. وبعد الاعتماد تُعمَّم على المعنيين ويُحدَّث سجل السياسات." },
  },
  {
    when: ["سياسه المكافات", "سياسه مكافات", "لائحه عمل لجنه", "سياسه المسؤوليه الاجتماعيه"],
    unless: ["توصيه", "الجمعيه"],
    finding: { level: "warn", text: "سياسة المكافآت ولوائح عمل لجان المراجعة والمكافآت والترشيحات وسياسة المسؤولية الاجتماعية تعتمدها الجمعية العامة بناءً على توصية المجلس؛ صُغ البند توصيةً للجمعية.", ref: "لائحة الحوكمة م51 وم57 وم58 وم61 وم84" },
  },
  {
    when: ["امين السر", "امين سر"],
    finding: { level: "tip", text: "يعيّن المجلس أمين السر ويعزله دون غيره، ويُستحسن أن يحمل مؤهلاً في القانون أو المالية أو المحاسبة أو الإدارة مع خبرة 3 سنوات.", ref: "نظام الشركات م78/4؛ لائحة الحوكمة م35 وم36" },
  },
  {
    when: ["الجمعيه العامه العاديه السنويه", "دعوه الجمعيه", "انعقاد الجمعيه"],
    finding: { level: "tip", text: "تُعقد الجمعية العادية السنوية خلال 6 أشهر من نهاية السنة المالية، وتُنشر الدعوة قبل 21 يوماً على الأقل، ويُعرض كل عقد لعضو فيه مصلحة في بند مستقل.", ref: "نظام الشركات م88 وم91 وم96" },
  },
];
const DECISION_VERBS = ["التصويت", "اعتماد", "الموافقه", "الموافقه علي", "تعيين", "اقرار", "التوصيه", "ترشيح", "تشكيل", "تفويض", "المصادقه", "منح", "انهاء", "تجديد", "اختيار", "انتخاب", "تحديد", "صرف", "الغاء", "تعديل", "اصدار"];

// Items about a financial or reporting period must name it (year, quarter or period end).
const PERIODIC = ["القوائم الماليه", "البيانات الماليه", "الميزانيه", "الموازنه", "الحسابات الختاميه", "التقرير السنوي", "تقرير مجلس الاداره", "الخطه السنويه", "توزيع الارباح", "الارباح المرحليه", "النتائج الماليه"];
const PERIOD = /(\d{4}|[٠-٩]{4}|الربع|ربع|النصف|السنه الماليه المنتهيه|الفتره المنتهيه|المنتهيه في)/;
// A title ending in a preposition or "year of" was cut short.
const DANGLING = /(?:^|\s)(لعام|عام|لسنه|سنه|للعام|للسنه|عن|علي|في|من|الي|ل|و|حتي|بشان|المنتهيه)\s*$/;

// The same trailing "year of" words, as typed, so they can be cut from the suggestion.
const YEAR_WORD = /\s*(لعام|عام|للعام|لسن[ةه]|سن[ةه]|للسن[ةه])\s*$/;

// "زيادة/تخفيض" or "(قانونياً/مالياً)": a choice the author must make. Dates and numbers (20/10/2028) are not choices.
const CHOICE = /\(?([^\s()/]+)\/([^\s()/]+)\)?/g;
const HAS_DIGIT = /[0-9٠-٩۰-۹]/;

// A word typed twice in a row, e.g. "مليون ريال ريال" after filling a blank that already ends in "ريال".
const REPEATED = /(^|\s)([^\s()،,.]{2,})\s+\2(?=$|[\s()،,.])/;

/** A word repeated by mistake, with the title fixed. */
export function repeatedWord(title: string): Finding | null {
  const m = title.match(REPEATED);
  if (!m) return null;
  return { level: "warn", text: `الكلمة «${m[2]}» مكررة في العنوان.`, fixes: [title.replace(REPEATED, "$1$2")] };
}

/** Unmade choices and unfilled blanks left from a standard wording; an item cannot be saved with them. */
export function templateGaps(title: string): Finding[] {
  const gaps: Finding[] = [];
  const choice = [...title.matchAll(CHOICE)].find(([, a, b]) => !HAS_DIGIT.test(a) && !HAS_DIGIT.test(b));
  if (choice) {
    const [whole, a, rest] = choice;
    // "بزيادة/تخفيض": the preposition on the first word belongs to both.
    const pre = a.length > 4 && a.startsWith("ب") ? "ب" : "";
    const b = pre && !rest.startsWith(pre) ? pre + rest : rest;
    const [shownA, shownB] = [a.slice(pre.length), b.slice(pre.length)];
    gaps.push({ level: "warn", template: true, text: `البند يحتمل أمرين («${shownA}» أو «${shownB}»)؛ اختر المقصود ليكون القرار محدداً.`, fixes: [a, b].map((w) => title.replace(whole, w)) });
  }
  if (/\((…|\.\.\.)\)|…/.test(title)) gaps.push({ level: "warn", template: true, text: "في العنوان فراغات (…) لم تُكمل بعد؛ أكملها بالاسم أو المبلغ أو التاريخ قبل اعتماد الجدول." });
  return gaps;
}

export type ReviewContext = {
  disclosures?: Disclosure[];
  year?: number;
  listed?: boolean;
  template?: AuthorityTemplate | null;
  powers?: Powers;
  /** Members' positions from their CVs, and the company's own name (never a conflict). */
  affiliations?: Affiliation[];
  company?: string;
  /** The committee kind when the meeting is a committee's: its decisions are checked against its statutory competencies. */
  committeeKind?: string;
};

/** `year` is the last completed financial year, used in suggested titles; `listed` adds the CMA rules; `template` and `powers` add who decides. */
export function reviewItem(
  item: ItemDraft,
  { disclosures = [], year = new Date().getFullYear() - 1, listed = false, template, powers, affiliations = [], company = "", committeeKind }: ReviewContext = {},
): Finding[] {
  // The auto-filled requirements block lists documents, not what the item is about.
  const about = withoutRequirements(item.description ?? "");
  const text = fold(withPhraseFixes(`${item.title} ${about}`));
  const base = withPhraseFixes(item.title.trim());
  const title = fold(base);
  const verbless = item.kind === "decision" && !DECISION_VERBS.some((v) => title.startsWith(fold(v)));
  const verb = verbless ? "التصويت على اعتماد " : "";
  const fullPeriod = `للسنة المالية المنتهية في 31 ديسمبر ${year}`;
  const repeated = repeatedWord(item.title);
  // Who decides: from the standard wording the item follows and the company's bylaws and assembly authorizations.
  const findings: Finding[] = [...templateGaps(base), ...(repeated ? [repeated] : []), ...authorityFindings(template, item.title, powers)];
  // A delegation is for "certain acts" (CL 77/1): it must say who, in what capacity, for what, and for how long.
  const delegation = /(^|\s)(تفويض|وكاله|توكيل)/.test(title) && !/تفويض مجلس الاداره|بتفويض مجلس|بناء علي تفويض|تفويض الجمعيه|تفويض ممثل|حسابات الشركه/.test(title);
  if (delegation && !(/بصفته/.test(title) && /(لمده|حتي|اعتبارا من|لانجاز|لاتمام)/.test(title)))
    findings.push({ level: "warn", text: "التفويض يكون لأعمال محددة: اذكر المفوَّض وصفته، والعمل أو المستند المحدد والجهة، والحدود المالية إن وجدت، والمدة، وهل يحق له تفويض الغير.", ref: "نظام الشركات م77/1 وم79" });
  if (DANGLING.test(title)) {
    const yearWord = YEAR_WORD.test(base);
    findings.push({
      level: "warn",
      text: "عنوان البند يبدو ناقصاً؛ اختر صيغة مكتملة أو أكمله يدوياً.",
      fixes: yearWord ? [`${verb}${base} ${year}`, `${verb}${base.replace(YEAR_WORD, "")} ${fullPeriod}`] : undefined,
    });
  } else if (has(text, PERIODIC) && !PERIOD.test(text) && !has(title, ["سياسه"])) {
    findings.push({ level: "warn", text: "حدّد الفترة التي يخصها البند (السنة أو الربع أو تاريخ نهاية الفترة).", fixes: [`${verb}${base} ${fullPeriod}`, `${verb}${base} لعام ${year}`] });
  }
  for (const d of disclosures) {
    const hit = keywords(d.details ?? "").find(({ key }) => text.includes(key));
    if (hit) findings.push({ level: "warn", text: `تعارض مصالح محتمل: ${d.name} أفصح عن مصلحة تتصل بـ«${hit.word}». يُفصح فوراً ويُثبت ذلك في المحضر، ولا يشارك في المداولة ولا التصويت.`, ref: "نظام الشركات م71؛ لائحة الحوكمة م42" });
  }
  for (const a of affiliationNotices(`${item.title} ${about}`, affiliations, company))
    findings.push({ level: "warn", text: `مصلحة محتملة: ورد في البند «${a.organization}»، و${a.name} ${a.role} فيها بحسب سيرته الذاتية. إن كانت له مصلحة مباشرة أو غير مباشرة فيُفصح للمجلس فوراً ويُثبت ذلك في المحضر، ولا يشارك في التصويت.`, ref: "نظام الشركات م71" });
  // A committee recommends to the board unless the regulations let it decide (CGR Art. 47/2 and each committee's articles).
  const rules = committeeKind ? committeeRules(committeeKind) : null;
  if (rules && item.kind === "decision") {
    const c = checkAgainstPowers(`${item.title} ${about}`, rules.powers);
    if (c.power && c.deciding && c.power.kind !== "decide")
      findings.push({ level: "warn", text: `اختصاص اللجنة هنا: ${c.power.ar} (${POWER_KINDS[c.power.kind]}). صُغ البند توصيةً لمجلس الإدارة، فالقرار للمجلس.`, ref: `لائحة الحوكمة ${c.power.ref}`, fixes: [asRecommendation(item.title)] });
    else if (!c.power && c.deciding)
      findings.push({ level: "tip", text: "لم يرد هذا القرار في الاختصاصات النظامية للجنة؛ تأكد أنه ضمن لائحة عملها أو تفويض من المجلس، وإلا فصُغه توصيةً للمجلس.", ref: "لائحة الحوكمة م47/2", fixes: [asRecommendation(item.title)] });
  }
  // A wording classified "per the bylaws" already carries the company-specific Art. 74 remark.
  const known = template?.authority === "bylaws" ? "نظام الشركات م74" : null;
  for (const r of RULES) if (has(text, r.when) && !(r.unless && has(text, r.unless)) && (!r.listed || listed) && r.finding.ref !== known) findings.push(r.finding);
  if (item.kind === "decision") {
    // The completed-title suggestions above already start with a verb.
    if (verbless && !findings.some((f) => f.fixes)) findings.push({ level: "tip", text: "صُغ بند القرار بفعل واضح.", fixes: [`التصويت على اعتماد ${base}`, `التصويت على ${base}`] });
    if (!item.description?.trim()) findings.push({ level: "tip", text: "أضف وصفاً يبيّن المطلوب من المجلس وأثر القرار." });
  }
  return findings;
}
