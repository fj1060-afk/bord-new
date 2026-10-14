// Drafting hints for resolution text: structural checks, not a language model.
// They flag what a well-formed board resolution usually states; the user decides.

const VAGUE = ["حسب الحاجة", "عند الحاجة", "وما في حكمه", "إلخ", "الخ", "في أقرب وقت", "بأسرع وقت", "مبلغ مناسب", "ما يلزم", "حسب ما يراه", "بالشكل المناسب"];
const DECISION = /^(قرر|قرّر|وافق|اعتمد|أقر|أقرّ|الموافقة|اعتماد|إقرار|تفويض|رفض|أجّل|تأجيل)/;
const OWNER = /(تفويض|تكليف|يتولى|تتولى|على الإدارة|الرئيس التنفيذي|العضو المنتدب|إدارة|لجنة|أمين السر|المدير)/;
const TIMEFRAME = /(خلال|بتاريخ|قبل|حتى|موعد|يوم|أسبوع|شهر|سنة|عام|الربع|تاريخ|فوراً|فورًا)/;
const AMOUNT = /\d[\d,.]*\s*(ريال|ر\.س|﷼)/;
const AMOUNT_IN_WORDS = /(فقط|ألف|آلاف|مليون|ملايين|مليار|مائة|مئة)/;

export function draftingHints(text: string): string[] {
  const t = text.trim();
  if (t.length < 15) return t ? ["نص القرار قصير جداً؛ اذكر ما قرره المجلس بوضوح."] : [];
  const hints: string[] = [];
  if (!DECISION.test(t)) hints.push("ابدأ بفعل القرار، مثل: «قرر المجلس…» أو «وافق المجلس على…».");
  const vague = VAGUE.filter((v) => t.includes(v));
  if (vague.length) hints.push(`عبارات غير محددة: «${vague.join("»، «")}». حدّد المقصود بدقة.`);
  if (AMOUNT.test(t) && !AMOUNT_IN_WORDS.test(t)) hints.push("اكتب المبلغ بالأرقام والحروف، مثل: (500,000) خمسمائة ألف ريال.");
  if (!OWNER.test(t)) hints.push("حدّد الجهة المسؤولة عن التنفيذ أو المفوَّض بها.");
  if (!TIMEFRAME.test(t)) hints.push("حدّد مدة التنفيذ أو تاريخه.");
  if (/([\u0621-\u064A])\1{2,}/.test(t) || /\s[،.]/.test(t)) hints.push("راجع علامات الترقيم والتكرار.");
  return hints;
}
