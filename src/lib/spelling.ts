// Arabic spelling suggestions: governance phrases checked locally (catches
// real words in the wrong place, like "القائم المالية"), plus LanguageTool's
// free public checker with governance terms ranked first.

export type Misspelling = { offset: number; length: number; word: string; suggestions: string[] };

const GLOSSARY = [
  "القوائم", "المالية", "الميزانية", "الحوكمة", "اللائحة", "اللوائح", "الجمعية", "العمومية", "المساهمين", "المراجعة", "المراجع", "الحسابات",
  "المكافآت", "الترشيحات", "التنفيذية", "الإدارة", "مجلس", "المجلس", "اللجنة", "اللجان", "النصاب", "المحضر", "التوصية", "الاعتماد", "اعتماد",
  "الموافقة", "التفويض", "الصلاحيات", "الاستراتيجية", "التشغيلية", "الربعية", "السنوية", "المرحلية", "الأرباح", "الخسائر", "الاحتياطي",
  "رأس", "المال", "الالتزام", "المخاطر", "الداخلية", "الخارجي", "الإفصاح", "تعارض", "المصالح", "التعاملات", "العلاقة", "النظام", "الأساس",
];

/** Edit distance between two strings (small words only). */
export function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** Glossary terms close to a misspelt word, best first. */
export function glossaryMatches(word: string) {
  const w = word.replace(/[\u064B-\u0652\u0640]/g, "");
  if (GLOSSARY.includes(w)) return [];
  return GLOSSARY.map((g) => ({ g, d: distance(w, g) }))
    .filter(({ g, d }) => d > 0 && d <= (g.length > 5 ? 2 : 1))
    .sort((a, b) => a.d - b.d)
    .map(({ g }) => g);
}

type LtMatch = { offset: number; length: number; replacements: { value: string }[]; rule?: { issueType?: string } };

const PHRASES = [
  "القوائم المالية", "البيانات المالية", "السنة المالية", "الجمعية العامة", "الجمعية العمومية", "مجلس الإدارة", "رأس المال", "مراجع الحسابات",
  "لجنة المراجعة", "لجنة المكافآت", "لجنة الترشيحات", "اللجنة التنفيذية", "النظام الأساس", "الأطراف ذات العلاقة", "تعارض المصالح",
  "الإدارة التنفيذية", "الرئيس التنفيذي", "المدير المالي", "الموازنة التقديرية", "الخطة الاستراتيجية", "التقرير السنوي", "توزيع الأرباح",
];

const bare = (w: string) => w.replace(/[\u064B-\u0652\u0640]/g, "");
const loose = (w: string) => bare(w).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const close = (w: string, target: string) => {
  const d = distance(bare(w), target);
  // "ومجلس" or "بالقوائم" is the right word with a prefix, not a slip.
  const prefixed = [w.replace(/^[وفبل]/, ""), w.replace(/^[وف]?(ال|بال|كال|لل)/, "ال")].some((c) => loose(c) === loose(target));
  return d > 0 && d <= (target.length > 5 ? 2 : 1) && loose(w) !== loose(target) && !prefixed;
};

/** Known two-word governance phrases where one word is right and its neighbour is a near miss. */
export function phraseSlips(text: string): Misspelling[] {
  const words = [...text.matchAll(/[\p{L}\u064B-\u0652\u0640]+/gu)].map((m) => ({ word: m[0], offset: m.index! }));
  const slips: Misspelling[] = [];
  for (let i = 0; i + 1 < words.length; i++) {
    const [a, b] = [words[i], words[i + 1]];
    for (const phrase of PHRASES) {
      const [pa, pb] = phrase.split(" ");
      const miss = loose(b.word) === loose(pb) && close(a.word, pa) ? { ...a, fix: pa } : loose(a.word) === loose(pa) && close(b.word, pb) ? { ...b, fix: pb } : null;
      if (miss && !slips.some((s) => s.offset === miss.offset)) slips.push({ offset: miss.offset, length: miss.word.length, word: miss.word, suggestions: [miss.fix] });
    }
  }
  return slips;
}

/** Applies the phrase fixes, so rules match what the author meant. */
export function withPhraseFixes(text: string) {
  return phraseSlips(text)
    .sort((x, y) => y.offset - x.offset)
    .reduce((t, s) => t.slice(0, s.offset) + s.suggestions[0] + t.slice(s.offset + s.length), text);
}

/** Checks Arabic text; `online` is false when LanguageTool was unreachable (phrase checks still ran). */
export async function checkSpelling(text: string, useOnline = true): Promise<{ matches: Misspelling[]; online: boolean }> {
  const local = phraseSlips(text);
  const online = useOnline ? await onlineCheck(text) : [];
  const rest = (online ?? []).filter((m) => !local.some((l) => m.offset < l.offset + l.length && l.offset < m.offset + m.length));
  return { matches: [...local, ...rest].sort((x, y) => x.offset - y.offset), online: online !== null };
}

async function onlineCheck(text: string): Promise<Misspelling[] | null> {
  if (!text.trim()) return [];
  try {
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      body: new URLSearchParams({ text, language: "ar" }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { matches } = (await res.json()) as { matches: LtMatch[] };
    return matches.flatMap((m) => {
      const word = text.slice(m.offset, m.offset + m.length);
      if (GLOSSARY.includes(word)) return [];
      const suggestions = [...new Set([...glossaryMatches(word), ...m.replacements.map((r) => r.value)])].slice(0, 4);
      return [{ offset: m.offset, length: m.length, word, suggestions }];
    });
  } catch (e) {
    console.warn("spelling check failed", e);
    return null;
  }
}
