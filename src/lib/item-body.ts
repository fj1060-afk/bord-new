// Each meeting takes only its own body's items: an audit committee meeting
// does not decide what is the board's, and the board does not take items
// worded for a committee.

import { BODIES, foreignTemplate, type Body, type Template } from "./item-templates";
import type { Finding } from "./item-review";
import { fold } from "./fold";

const label = (body: Body) => (body === "any" ? "هذه اللجنة" : BODIES[body]);

/**
 * When the title follows another body's wording: a warning with the
 * meeting's nearest own wording as the fix, and whether saving is refused
 * (the title fills that wording exactly, so it is plainly the other body's).
 */
export function bodyMismatch(title: string, own: Template[], body: Body): (Finding & { block: boolean }) | null {
  const hit = foreignTemplate(title, own, body);
  if (!hit) return null;
  const instead = hit.instead ? ` الأقرب من بنود ${label(body)}: «${hit.instead.title}».` : "";
  return {
    level: "warn",
    text: `هذا البند من بنود ${BODIES[hit.template.body]}، ولا يُعرض على ${label(body)}.${instead}`,
    ...(hit.instead ? { fixes: [hit.instead.title] } : {}),
    block: hit.exact,
  };
}

/** A title reduced for comparison: folded Arabic, Latin digits, no punctuation or brackets, single spaces. */
export function itemKey(title: string): string {
  return fold(title)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The other item in the meeting with the same title, if any. */
export function duplicateOf<T extends { id: string; title: string }>(title: string, items: T[], selfId?: string | null): T | undefined {
  const key = itemKey(title);
  return items.find((i) => i.id !== selfId && itemKey(i.title) === key);
}
