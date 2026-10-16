// Who decides an agenda item, and how the General Assembly is involved.
// The category comes from the law; whether a "bylaws" power is restricted,
// and whether the board holds a current assembly authorization, come from
// the company's settings (its bylaws and assembly resolutions).

import type { Finding } from "./item-review";
import { blankValues, fillBlanks } from "./translate";

export type Authority =
  | "board" // the board decides
  | "board_then_ga" // the board decides; presented to the next General Assembly
  | "board_authorized" // the board decides only under a current assembly authorization
  | "ga_ordinary" // the ordinary General Assembly decides on the board's recommendation
  | "ga_extraordinary" // the extraordinary General Assembly decides on the board's recommendation
  | "bylaws" // the board decides unless the bylaws or the assembly restrict the power
  | "committee"; // a committee's own decision or recommendation to the board

export const AUTHORITY: Record<Authority, { label: string; hint: string }> = {
  board: { label: "قرار المجلس", hint: "من صلاحيات مجلس الإدارة نظاماً." },
  board_then_ga: { label: "قرار المجلس · يُعرض على الجمعية", hint: "يقرره المجلس ويُعرض على أول جمعية عامة." },
  board_authorized: { label: "يتطلب تفويضاً من الجمعية", hint: "يقرره المجلس بتفويض ساري من الجمعية العامة؛ وإلا يُرفع توصيةً لها." },
  ga_ordinary: { label: "توصية للجمعية العادية", hint: "تقرره الجمعية العامة العادية بناءً على توصية المجلس." },
  ga_extraordinary: { label: "توصية للجمعية غير العادية", hint: "تقرره الجمعية العامة غير العادية بناءً على توصية المجلس." },
  bylaws: { label: "حسب النظام الأساس", hint: "من صلاحيات المجلس ما لم يقيّدها النظام الأساس أو الجمعية." },
  committee: { label: "قرار/توصية اللجنة", hint: "تقرره اللجنة أو ترفعه توصيةً للمجلس." },
};

/** Board powers a company's bylaws (or an assembly) may restrict (Companies Law Art. 74 and the bylaws). */
export const RESTRICTABLE = {
  loans: "عقد القروض والتسهيلات",
  pledges: "رهن أصول الشركة",
  guarantees: "تقديم الكفالات والضمانات",
  debt_relief: "إبراء مديني الشركة وشطب الديون",
  donations: "التبرعات",
  asset_sale: "بيع أصول الشركة (دون 50%)",
} as const;
export type Restrictable = keyof typeof RESTRICTABLE;

/** Assembly authorizations the board may act under. */
export const AUTHORIZATIONS = {
  interim_dividends: "توزيع أرباح مرحلية",
  related_party: "الترخيص بتعاملات الأطراف ذات العلاقة (المادة 27)",
  buyback: "إتمام شراء الشركة لأسهمها",
} as const;
export type AuthorizationKind = keyof typeof AUTHORIZATIONS;

/** Which setting decides a "bylaws" or "board_authorized" item. */
export type Power = Restrictable | AuthorizationKind;
export const isAuthorization = (p: Power): p is AuthorizationKind => p in AUTHORIZATIONS;


export type AuthorityTemplate = { title: string; authority: Authority; authorityRef?: string; power?: Power; alt?: { title: string; en: string } };
export type Grant = { kind: AuthorizationKind; granted_on: string; expires_on: string | null };
export type Powers = { restricted: Restrictable[]; grants: Grant[]; today: string };

/** When a grant lapses: its own expiry, else one year after it was granted (the longest assembly delegation, IR Art. 64). */
export function grantExpiry(g: Grant) {
  if (g.expires_on) return g.expires_on;
  const d = new Date(`${g.granted_on}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
export const activeGrant = (powers: Powers, kind: AuthorizationKind) => powers.grants.find((g) => g.kind === kind && g.granted_on <= powers.today && grantExpiry(g) >= powers.today);

const isRecommendation = (title: string) => /^التوصية للجمعية العامة/.test(title.trim());

/** The alternative wording with the values already typed into the item's blanks. */
function altTitle(t: AuthorityTemplate, title: string) {
  if (!t.alt) return undefined;
  const values = blankValues(t.title, title);
  return (values && fillBlanks(t.alt.title, values)) || t.alt.title;
}

/** Remarks on who decides the item, given the company's bylaws restrictions and assembly authorizations. */
export function authorityFindings(t: AuthorityTemplate | null | undefined, title: string, powers?: Powers): Finding[] {
  if (!t) return [];
  const ref = t.authorityRef;
  switch (t.authority) {
    case "ga_ordinary":
    case "ga_extraordinary":
      return isRecommendation(title) ? [] : [{ level: "warn", text: `${AUTHORITY[t.authority].hint} صغ البند توصيةً للجمعية لا قراراً نهائياً من المجلس.`, ref }];
    case "board_then_ga":
      return [{ level: "tip", text: AUTHORITY.board_then_ga.hint, ref }];
    case "board_authorized": {
      if (isRecommendation(title) || !t.power || !isAuthorization(t.power)) return [];
      const grant = powers && activeGrant(powers, t.power);
      if (grant) return [{ level: "tip", text: `يستند إلى تفويض الجمعية العامة الساري (${AUTHORIZATIONS[t.power]}) من ${grant.granted_on} حتى ${grantExpiry(grant)}.`, ref }];
      const fix = altTitle(t, title);
      return [{ level: "warn", text: `لا يوجد تفويض ساري من الجمعية العامة لـ«${AUTHORIZATIONS[t.power]}» في ملف الشركة؛ يُرفع البند توصيةً للجمعية، أو سجّل التفويض إن وُجد.`, ref, ...(fix ? { fixes: [fix] } : {}) }];
    }
    case "bylaws": {
      if (isRecommendation(title) || !t.power || isAuthorization(t.power)) return [];
      if (powers?.restricted.includes(t.power)) {
        const fix = altTitle(t, title);
        return [{ level: "warn", text: `النظام الأساس للشركة يقيّد صلاحية المجلس في «${RESTRICTABLE[t.power]}» (حسب ملف الشركة)؛ يُرفع البند توصيةً للجمعية.`, ref, ...(fix ? { fixes: [fix] } : {}) }];
      }
      return [{ level: "tip", text: `${AUTHORITY.bylaws.hint} تحقق من النظام الأساس وجدول الصلاحيات.`, ref }];
    }
    default:
      return [];
  }
}
