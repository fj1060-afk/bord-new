// Standard agenda item wordings, suggested while the title is typed.

import { fold } from "./item-review";
import { withPhraseFixes } from "./spelling";
import { buildTemplates, type Body, type Kind, type Template } from "./item-templates-data";

export { BODIES, CATEGORIES, type Body, type Template } from "./item-templates-data";
export type TitleSuggestion = { title: string; en?: string; kind: Kind; needs?: string };

export const templates = (today = new Date()) => buildTemplates(today);

const bareWord = (w: string) => w.replace(/^(وال|بال|فال|لل|ال|و|ب|ل)/, "");

/** A company's own library rows as templates. */
export const libraryTemplates = (rows: { title: string; title_en?: string | null; body?: string | null; kind: string; category: string; needs: string | null }[]): Template[] =>
  rows.map((r) => ({ category: r.category, body: (r.body ?? "any") as Body, keys: [], title: r.title, kind: r.kind as Kind, ...(r.title_en ? { en: r.title_en } : {}), ...(r.needs ? { needs: r.needs } : {}) }));

/**
 * Search-as-you-type over standard titles: every typed word, including the
 * one still being typed, must start a word of the title or its keywords
 * ("تعي" finds "تعيين"). Spelling slips in known phrases are forgiven.
 */
export function searchTemplates<T extends Template>(input: string, list: T[], limit = Infinity, body?: Body): T[] {
  const text = fold(withPhraseFixes(input.trim()));
  const words = text.split(/\s+/).filter((w) => w.length >= 2 && bareWord(w).length >= 2);
  if (text.length < 3 || !words.length) return [];
  return list
    .map((t) => {
      const title = fold(t.title);
      const keys = t.keys.map(fold);
      const tokens = `${title} ${keys.join(" ")}`.split(/[^\p{L}\p{N}]+/u).flatMap((tk) => [tk, bareWord(tk)]);
      const all = words.every((w) => tokens.some((tk) => tk.startsWith(w) || tk.startsWith(bareWord(w))));
      const fits = body && (t.body === body ? 30 : t.body === "any" ? 15 : 0);
      const score = (title.includes(text) ? 20 : 0) + keys.filter((k) => text.includes(k)).reduce((n, k) => n + k.length, 0) + (fits || 0);
      return { t, all, score, exact: title === text };
    })
    .filter((m) => m.all && !m.exact)
    .sort((a, b) => b.score - a.score || a.t.title.length - b.t.title.length)
    .slice(0, limit)
    .map((m) => m.t);
}

/** Up to `limit` titles for the item form, from the company's own items and the built-in ones; items for `body` rank first. */
export function suggestTitles(input: string, today = new Date(), limit = 5, own: Template[] = [], body?: Body): TitleSuggestion[] {
  return searchTemplates(input, [...own, ...templates(today)], limit, body).map(({ title, en, kind, needs }) => ({ title, kind, ...(en ? { en } : {}), ...(needs ? { needs } : {}) }));
}

/** The library's meeting type for a board or a committee kind. */
export function bodyOf(meeting: { board_id: string | null; committee_kind?: string | null }): Body {
  if (meeting.board_id) return "board";
  const kind = meeting.committee_kind ?? "";
  return kind === "audit" ? "audit" : kind === "risk" ? "risk" : ["remuneration", "nomination", "remuneration_nomination"].includes(kind) ? "nrc" : "any";
}
