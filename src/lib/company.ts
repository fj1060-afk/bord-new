// The company profile: which rule pack applies and the articles of association's settings.

export const COMPANY_TYPES = {
  listed_jsc: "شركة مساهمة مدرجة",
  unlisted_jsc: "شركة مساهمة غير مدرجة",
  llc: "شركة ذات مسؤولية محدودة",
  nonprofit: "جهة غير ربحية",
  other: "أخرى",
} as const;

export type CompanyType = keyof typeof COMPANY_TYPES;

export type CompanyProfile = {
  name: string;
  name_en: string | null;
  document_language: "ar" | "bilingual";
  company_type: CompanyType;
  fiscal_year_end_month: number;
  min_board_meetings: number;
  quorum_percent: number;
  quorum_min_present: number;
  proxy_allowed: boolean;
  max_term_years: number;
  invite_days: number;
  secretary_person_id: string | null;
  secretary_appointed_on: string | null;
  secretary_resolution: string | null;
  secretary_qualification: string | null;
};

/** Statutory floors (Companies Law arts. 68, 80; CMA Corporate Governance Regulations art. 30). */
export const LEGAL_LIMITS = { maxTermYears: 4, minQuorumPercent: 50, minBoardMeetings: 4, inviteDays: 5 } as const;

export type QuorumRule = { percent: number; minPresent: number };

/** Board meetings follow the profile's quorum; committees keep the default (half). */
export function quorumRule(profile: Pick<CompanyProfile, "quorum_percent" | "quorum_min_present"> | null, isBoard: boolean): QuorumRule {
  return isBoard && profile ? { percent: profile.quorum_percent, minPresent: profile.quorum_min_present } : { percent: 50, minPresent: 1 };
}

/** Members needed: the percentage rounded up, at least `minPresent`, never more than the members. */
export function quorumNeeded(members: number, rule: QuorumRule = { percent: 50, minPresent: 1 }): number {
  if (members <= 0) return 1;
  return Math.min(members, Math.max(1, Math.ceil((members * rule.percent) / 100), rule.minPresent));
}

/** Settings below a statutory floor, as Arabic warnings. */
export function profileWarnings(p: Pick<CompanyProfile, "company_type" | "min_board_meetings" | "invite_days">): string[] {
  const warnings: string[] = [];
  const jsc = p.company_type === "listed_jsc" || p.company_type === "unlisted_jsc";
  if (jsc && p.min_board_meetings < LEGAL_LIMITS.minBoardMeetings) warnings.push("نظام الشركات (م80) يوجب أربعة اجتماعات للمجلس في السنة على الأقل.");
  if (p.company_type === "listed_jsc" && p.invite_days < LEGAL_LIMITS.inviteDays) warnings.push("لائحة حوكمة الشركات (م30/ج) توجب إرسال الدعوة قبل خمسة أيام على الأقل.");
  return warnings;
}
