// Arabic spelling suggestions: LanguageTool's free public checker, with
// governance terms it does not know ranked first.

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

/** Checks Arabic text; returns nothing when the service is unreachable. */
export async function checkSpelling(text: string): Promise<Misspelling[]> {
  if (!text.trim()) return [];
  try {
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      body: new URLSearchParams({ text, language: "ar" }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const { matches } = (await res.json()) as { matches: LtMatch[] };
    return matches.flatMap((m) => {
      const word = text.slice(m.offset, m.offset + m.length);
      if (GLOSSARY.includes(word)) return [];
      const suggestions = [...new Set([...glossaryMatches(word), ...m.replacements.map((r) => r.value)])].slice(0, 4);
      return [{ offset: m.offset, length: m.length, word, suggestions }];
    });
  } catch (e) {
    console.warn("spelling check failed", e);
    return [];
  }
}
