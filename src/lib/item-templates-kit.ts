// Shared wording and requirement builders for the built-in item library.

import type { Req, ReqDue, ReqFrom } from "./requirements";

// Years and dates are left as blanks for the secretary to fill; an item cannot be saved with a blank.
export const fy = "للسنة المالية المنتهية في (…)";
export const fyEn = "for the financial year ended (…)";
export const period = "للفترة المنتهية في (…)";
export const periodEn = "for the period ended (…)";
export const ga = "التوصية للجمعية العامة العادية";
export const gaEn = "Recommending to the Ordinary General Assembly";
export const ega = "التوصية للجمعية العامة غير العادية";
export const egaEn = "Recommending to the Extraordinary General Assembly";
/** The wording used when the board cannot decide alone: the same item as a recommendation to the Ordinary General Assembly. */
export const toGa = (ar: string, en: string) => ({ title: `${ga} ${ar}`, en: `${gaEn} ${en}` });

/** A document provided before the meeting (by the item owner unless said otherwise). */
export const doc = (ar: string, en: string, from: ReqFrom = "owner"): Req => ({ k: "doc", ar, en, from });
/** A committee recommendation; without `from` the secretary assigns the committee. */
export const rec = (ar: string, en: string, from?: ReqFrom): Req => ({ k: "rec", ar, en, ...(from ? { from } : {}) });
/** Something the secretary confirms. */
export const chk = (ar: string, en: string): Req => ({ k: "check", ar, en, from: "secretary" });
/** A conflict-of-interest check the secretary confirms against members' disclosures. */
export const noInterest = (ar = "التحقق من عدم وجود مصلحة لعضو", en = "Confirm no board member has an interest"): Req => ({ k: "check", ar, en, from: "secretary", auto: "conflict" });
/** A follow-up action once the resolution passes. */
export const after = (ar: string, en: string, due?: ReqDue, from: ReqFrom = "owner"): Req => ({ k: "after", ar, en, from, ...(due ? { due } : {}) });

export const disclose = (ar = "الإفصاح للمدرجة", en = "Disclosure (listed companies)"): Req => after(ar, en, "immediate", "ir");
export const bylawsPower = (ar = "صلاحية المجلس وفق النظام الأساس", en = "Board's power under the bylaws"): Req => chk(ar, en);

/** What a policy item needs before the board votes on it. */
export const POLICY_REQS: Req[] = [
  doc("مسودة السياسة النهائية", "Final draft policy"),
  doc("جدول مقارنة التعديلات ومبرراتها (عند التحديث)", "Comparison of changes and their rationale (for updates)"),
  rec("توصية اللجنة المختصة", "Recommendation of the competent committee"),
  doc("المراجعة القانونية والتوافق مع الأنظمة والنظام الأساس", "Legal review of compliance with regulations and the bylaws", "legal"),
  doc("الإدارة المالكة للسياسة وتاريخ النفاذ وموعد المراجعة القادمة", "Policy owner, effective date and next review date"),
];

/** POLICY_REQS with the governing article cited on the draft, the generic recommendation optionally replaced, and extras appended. */
export function policy(ref?: { ar: string; en: string }, committee?: Req, ...extra: Req[]): Req[] {
  const reqs = POLICY_REQS.map((r, i) => (i === 0 && ref ? { ...r, ar: `${r.ar} ${ref.ar}`, en: `${r.en} ${ref.en}` } : r));
  return [...(committee ? reqs.map((r) => (r.k === "rec" ? committee : r)) : reqs), ...extra];
}
