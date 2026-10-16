// The compliance scan a library item goes through before it is saved: the
// agenda item rules (Companies Law, CMA governance and disclosure rules),
// wording checks, and a look for an equivalent standard item.

import { fold, reviewItem, type Finding } from "./item-review";
import type { Body, Template } from "./item-templates-data";

export type ScanDraft = { title: string; en?: string | null; kind: string; body: Body; needs?: string | null };
export type ScanResult = { findings: Finding[]; similar?: string; passed: boolean };

const words = (s: string) => new Set(fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));

/** Share of the shorter title's words found in the other title. */
function overlap(a: string, b: string) {
  const [x, y] = [words(a), words(b)];
  const small = x.size <= y.size ? x : y;
  const big = small === x ? y : x;
  return small.size ? [...small].filter((w) => big.has(w)).length / small.size : 0;
}

export function scanItem(draft: ScanDraft, standard: Template[], listed = false): ScanResult {
  const title = fold(draft.title);
  // A library item has no description yet; that is asked for when it is used in a meeting.
  // Choices and blanks are expected in a library wording; they are flagged when the item is used.
  const findings = reviewItem({ title: draft.title, description: draft.needs || "-", kind: draft.kind }, { listed }).filter((f) => !f.template);
  const vote = title.startsWith(fold("التصويت")) || title.includes(fold("التوصيه للجمعيه"));
  if (vote && draft.kind !== "decision") findings.push({ level: "warn", text: "الصيغة تطلب تصويتاً أو توصية، فيجب أن يكون الغرض «للقرار»." });
  if (draft.body !== "board" && draft.body !== "any" && title.startsWith(fold("التوصيه للجمعيه"))) {
    findings.push({ level: "warn", text: "اللجان لا ترفع توصياتها للجمعية مباشرة؛ تُرفع التوصية لمجلس الإدارة.", ref: "لائحة الحوكمة (اختصاصات اللجان)" });
  }
  if (!draft.en?.trim()) findings.push({ level: "tip", text: "أضف الصيغة بالإنجليزية لتظهر في المستندات ثنائية اللغة." });
  const match = standard.map((t) => ({ t, o: overlap(draft.title, t.title) })).sort((a, b) => b.o - a.o)[0];
  const similar = match && match.o >= 0.8 ? match.t.title : undefined;
  return { findings, similar, passed: !findings.some((f) => f.level === "warn") };
}
