// Each meeting takes only its own body's items: an audit committee meeting
// does not decide what is the board's, and the board does not take items
// worded for a committee.

import { BODIES, foreignTemplate, type Body, type Template } from "./item-templates";
import type { Finding } from "./item-review";

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
