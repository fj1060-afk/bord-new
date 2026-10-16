// Splits pasted bylaws or charter text into numbered articles. Article lines
// read "المادة (5)", "مادة 5:", "المادة الخامسة - الغرض", "Article 5" and the like; "الباب"
// and "الفصل" lines become the chapter of the articles that follow.

export type Article = { number: string; heading: string | null; chapter: string | null; body: string };

const UNITS: Record<string, number> = {
  الأولى: 1, الاولى: 1, الأول: 1, الاول: 1, الحادية: 1, الحادي: 1,
  الثانية: 2, الثاني: 2, الثالثة: 3, الثالث: 3, الرابعة: 4, الرابع: 4, الخامسة: 5, الخامس: 5,
  السادسة: 6, السادس: 6, السابعة: 7, السابع: 7, الثامنة: 8, الثامن: 8, التاسعة: 9, التاسع: 9,
};
const TENS: Record<string, number> = {
  العاشرة: 10, العاشر: 10, العشرون: 20, العشرين: 20, الثلاثون: 30, الثلاثين: 30, الأربعون: 40, الاربعون: 40, الأربعين: 40, الاربعين: 40,
  الخمسون: 50, الخمسين: 50, الستون: 60, الستين: 60, السبعون: 70, السبعين: 70, الثمانون: 80, الثمانين: 80, التسعون: 90, التسعين: 90,
};
const ORDINAL_WORD = [...Object.keys(UNITS), ...Object.keys(TENS), "عشرة", "عشر", "المائة", "المئة", "بعد", "و"].join("|");

const latin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** "الحادية والعشرون" → 21, "الخامسة بعد المائة" → 105; null when the words are not an ordinal. */
export function ordinalValue(words: string): number | null {
  let n = 0;
  let seen = false;
  for (const raw of words.split(/\s+/)) {
    const w = raw.replace(/^و(?=ال)/, "");
    if (!w || w === "و" || w === "بعد") continue;
    if (w in UNITS) n += UNITS[w];
    else if (w in TENS) n += TENS[w];
    else if (w === "عشرة" || w === "عشر") n += 10;
    else if (w === "المائة" || w === "المئة") n += 100;
    else return null;
    seen = true;
  }
  return seen ? n : null;
}

const ARTICLE = new RegExp(String.raw`^\s*(?:(?:ال)?مادة|Article)\s*(?:رقم\s*|No\.?\s*)?(?:[(\[]\s*([0-9٠-٩۰-۹]+)\s*[)\]]|([0-9٠-٩۰-۹]+)|((?:(?:${ORDINAL_WORD})\s*)+))\s*[:：\-–—.)]?\s*(.*)$`);
// "المادة (5) من هذا النظام" wrapped onto a new line is a reference, not an article.
const REFERENCE = /^(?:من|في|فى|of|from|in|under|and|or)(?:\s|$)/i;
const CHAPTER = new RegExp(String.raw`^\s*(?:ال)?(?:باب|فصل)\s+(?:[(\[]?[0-9٠-٩۰-۹]+|(?:${ORDINAL_WORD})(?:\s|$|[:：\-–—]))`);

export function splitArticles(text: string): Article[] {
  const out: Article[] = [];
  let chapter: string | null = null;
  let current: Article | null = null;
  let preamble: string[] = [];
  const close = () => {
    if (current) out.push({ ...current, body: current.body.trim() });
    current = null;
  };
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const m = ARTICLE.exec(line);
    const number = m && (m[1] ?? m[2] ? latin(m[1] ?? m[2]) : m[3] && ordinalValue(m[3].trim()) !== null ? String(ordinalValue(m[3].trim())) : null);
    // Numbers only go up, so a lower one is a wrapped reference too.
    const last = Number((current as Article | null)?.number ?? out.at(-1)?.number);
    const isArticle = m && number && !REFERENCE.test(m[4].trim()) && !(Number(number) <= last);
    if (isArticle && m && number) {
      close();
      if (preamble.join("").trim() && !out.length) out.push({ number: "تمهيد", heading: null, chapter: null, body: preamble.join("\n").trim() });
      preamble = [];
      const rest = m[4].trim();
      const heading = rest && rest.length <= 80 ? rest : null;
      current = { number, heading, chapter, body: heading ? "" : rest };
    } else if (CHAPTER.test(line) && line.trim().length <= 120) {
      close();
      chapter = line.trim();
    } else if (current) {
      (current as Article).body += `${line}\n`;
    } else {
      preamble.push(line);
    }
  }
  close();
  if (!out.length && preamble.join("").trim()) out.push({ number: "تمهيد", heading: null, chapter: null, body: preamble.join("\n").trim() });
  return out;
}

export const GOVERNANCE_KINDS = {
  bylaws: "النظام الأساس",
  board_charter: "لائحة عمل مجلس الإدارة",
  committee_charter: "لائحة لجنة",
  policy: "سياسة",
  other: "لائحة أو نظام داخلي آخر",
} as const;

export const APPROVERS = {
  ga_extraordinary: "الجمعية العامة غير العادية",
  ga_ordinary: "الجمعية العامة العادية",
  board: "مجلس الإدارة",
  committee: "اللجنة",
} as const;

/** Where the file sits in the documents library. */
export const LIBRARY_CATEGORY: Record<keyof typeof GOVERNANCE_KINDS, "regulation" | "charter" | "policy" | "other"> = {
  bylaws: "regulation",
  board_charter: "charter",
  committee_charter: "charter",
  policy: "policy",
  other: "other",
};
