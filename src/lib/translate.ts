// Arabic to English machine translation through free web endpoints (no
// key): Google's web endpoint, then MyMemory. Both are rate-limited, so
// results are cached and callers must cope with null (no translation).

const cache = new Map<string, string>();

async function google(q: string) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as [[string, string][]];
  return data[0].map((part) => part[0]).join("").trim() || null;
}

async function myMemory(q: string) {
  const url = `https://api.mymemory.translated.net/get?langpair=ar|en&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) return null;
  const { responseData, responseStatus } = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
  const text = responseData?.translatedText?.trim();
  return responseStatus === 200 && text && !text.startsWith("MYMEMORY WARNING") ? text : null;
}

export async function translateArabic(text: string): Promise<string | null> {
  const q = text.trim().slice(0, 500);
  if (!q) return "";
  const hit = cache.get(q);
  if (hit) return hit;
  for (const service of [google, myMemory]) {
    try {
      const out = await service(q);
      if (out) {
        if (cache.size > 2000) cache.clear();
        cache.set(q, out);
        return out;
      }
    } catch {
      // try the next service
    }
  }
  return null;
}

const BLANK = "(…)";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The values typed into the blanks of a standard wording, or null when the
 * title no longer follows it. "التصويت على فتح فرع للشركة في (…)" and
 * "التصويت على فتح فرع للشركة في لندن" give ["لندن"].
 */
export function blankValues(template: string, title: string): string[] | null {
  if (!template.includes(BLANK)) return null;
  const pattern = template.split(BLANK).map(escape).join("(.+?)");
  const m = title.trim().match(new RegExp(`^${pattern}$`, "s"));
  return m ? m.slice(1).map((v) => v.trim()) : null;
}

/** Puts values into the English wording's blanks in order; null if the counts differ. */
export function fillBlanks(templateEn: string, values: string[]): string | null {
  const parts = templateEn.split(BLANK);
  if (parts.length - 1 !== values.length) return null;
  return parts.reduce((out, part, i) => out + (i ? values[i - 1] : "") + part, "");
}

/** Whether a value needs translating (it has Arabic letters). */
export const hasArabic = (s: string) => /[؀-ۿ]/.test(s);
