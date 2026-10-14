// English labels for bilingual printed documents (the Arabic ones live beside each constant).

export const ATTENDANCE_EN = { present: "Present", remote: "Remote", proxy: "Proxy", excused: "Excused", absent: "Absent" } as const;
export const ITEM_KINDS_EN = { information: "For information", discussion: "For discussion", decision: "For decision" } as const;
export const MEETING_MODES_EN = { in_person: "In person", virtual: "Video conference", hybrid: "Hybrid" } as const;
export const MEETING_TYPES_EN = { regular: "Ordinary", extraordinary: "Extraordinary" } as const;
export const CATEGORIES_EN = { independent: "Independent", non_executive: "Non-executive", executive: "Executive" } as const;
export const BOARD_ROLES_EN: Record<string, string> = { chair: "Chairman", vice_chair: "Vice Chair", member: "Member" };
export const COMMITTEE_ROLES_EN: Record<string, string> = { chair: "Committee Chair", member: "Member", secretary: "Committee Secretary" };
export const REMARK_KINDS_EN = { comment: "Comment", reservation: "Reservation", dissent: "Dissent", recusal: "Recusal (conflict of interest)" } as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "15 October 2026" for a YYYY-MM-DD in Riyadh time. */
export function englishDate(date: Date): string {
  const d = new Date(date.getTime() + 3 * 3600000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
