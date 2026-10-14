// Board secretary rules: what minutes must contain, and circular resolutions.

export const REMARK_KINDS = {
  comment: "ملاحظة على المسودة",
  reservation: "تحفظ",
  dissent: "رأي مخالف",
  recusal: "امتناع لتعارض المصالح",
} as const;
export type RemarkKind = keyof typeof REMARK_KINDS;

export const CIRCULAR_STATUS = { open: "مفتوح للتصويت", passed: "صدر", rejected: "لم يصدر", withdrawn: "مسحوب" } as const;
export const VOTES = { approve: "موافق", reject: "غير موافق", abstain: "ممتنع" } as const;

type MinutesInput = {
  meeting: { started_at: string | null; ended_at: string | null; location: string | null; mode: string };
  members: string[];
  attendance: Record<string, string>;
  items: { id: string; status: string }[];
  deliberation: Record<string, string | null>;
  resolutions: { votes_for: number | null; votes_against: number | null; votes_abstain: number | null }[];
};

/**
 * What the minutes still lack before signature (Secretary Guide: date, start and
 * end time, place, attendees, deliberations, resolutions and voting results).
 */
export function minutesGaps(m: MinutesInput): string[] {
  const gaps: string[] = [];
  if (!m.meeting.started_at || !m.meeting.ended_at) gaps.push("وقت بداية الاجتماع ونهايته غير مسجّل.");
  if (m.meeting.mode !== "virtual" && !m.meeting.location?.trim()) gaps.push("مكان الاجتماع غير محدد.");
  const unrecorded = m.members.filter((id) => !m.attendance[id]).length;
  if (unrecorded) gaps.push(`حضور ${unrecorded} من الأعضاء غير مسجّل.`);
  const silent = m.items.filter((i) => i.status !== "deferred" && !m.deliberation[i.id]?.trim()).length;
  if (silent) gaps.push(`${silent} بند بلا ملخص للنقاش.`);
  const unvoted = m.resolutions.filter((r) => r.votes_for === null && r.votes_against === null && r.votes_abstain === null).length;
  if (unvoted) gaps.push(`${unvoted} قرار بلا نتيجة تصويت.`);
  return gaps;
}

/** A circular resolution passes with the approval of a majority of all voting members (art. 82). */
export function circularOutcome(voters: number, votes: { vote: string }[]) {
  const count = (v: string) => votes.filter((x) => x.vote === v).length;
  const approve = count("approve");
  const pending = Math.max(0, voters - votes.length);
  const majority = Math.floor(voters / 2) + 1;
  const outcome = approve >= majority ? "passed" : approve + pending < majority ? "rejected" : "pending";
  return { approve, reject: count("reject"), abstain: count("abstain"), pending, majority, outcome } as const;
}
