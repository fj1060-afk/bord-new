// Members' positions from their CVs (owner, partner, chair, executive …) and
// the companies an agenda item names: a member tied to a named company may
// have an interest in the item (Companies Law Art. 71).

import { fold } from "./fold";

export const POSITION_ROLES = {
  owner: "مالك",
  partner: "شريك",
  chair: "رئيس مجلس الإدارة",
  vice_chair: "نائب رئيس مجلس الإدارة",
  board_member: "عضو مجلس الإدارة",
  committee_member: "عضو لجنة",
  ceo: "الرئيس التنفيذي",
  executive: "تنفيذي",
  employee: "موظف",
  advisor: "مستشار",
  other: "منصب آخر",
} as const;
export type PositionRole = keyof typeof POSITION_ROLES;

/** Board seats, counted for the five-listed-companies limit (CGR Art. 17/c). */
export const BOARD_SEATS: PositionRole[] = ["chair", "vice_chair", "board_member"];

export type Affiliation = { name: string; organization: string; role: PositionRole; title?: string | null; current: boolean };

// Words that describe a company's form, not its name.
const GENERIC = new Set(
  ["شركة", "شركه", "مؤسسة", "مجموعة", "المحدودة", "محدودة", "ذات", "المسؤولية", "مسؤولية", "مساهمة", "المساهمة", "مقفلة", "عامة", "القابضة", "التجارية", "للتجارة", "ذ", "م", "co", "company", "ltd", "llc", "inc", "plc", "group", "corp", "corporation", "holding", "the"].map(fold),
);

const PREFIX = /^(?:وال|بال|فال|كال|لل|ال|و|ب|ل)(?=..)/;
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const bare = (w: string) => w.replace(PREFIX, "");

/** The distinctive words of a company name ("شركة المراعي القابضة" → ["مراعي"]). */
export function nameCore(organization: string): string[] {
  return words(organization)
    .filter((w) => !GENERIC.has(w) && !GENERIC.has(bare(w)))
    .map(bare);
}

/** True when the item names the company: its core words appear in order. */
export function namesCompany(text: string, organization: string): boolean {
  const core = nameCore(organization);
  if (!core.length || core.join("").length < 3) return false;
  const tokens = words(text).map(bare);
  return tokens.some((_, i) => core.every((c, j) => tokens[i + j] === c));
}

const roleText = (a: Affiliation) => (a.role === "other" && a.title ? a.title : POSITION_ROLES[a.role]);

/**
 * Members' current positions in companies the item names, except the
 * company itself. One notice per member and company.
 */
export function affiliationNotices(text: string, affiliations: Affiliation[], ownCompany = ""): { name: string; organization: string; role: string }[] {
  const own = nameCore(ownCompany).join(" ");
  const seen = new Set<string>();
  return affiliations
    .filter((a) => a.current && nameCore(a.organization).join(" ") !== own && namesCompany(text, a.organization))
    .filter((a) => {
      const key = `${a.name}|${nameCore(a.organization).join(" ")}`;
      return !seen.has(key) && seen.add(key);
    })
    .map((a) => ({ name: a.name, organization: a.organization, role: roleText(a) }));
}

/** Seats on listed boards beyond the limit of five (CGR Art. 17/c); `here` counts this company when it is listed. */
export function listedSeats(positions: { role: PositionRole; listed: boolean; current: boolean }[], here: boolean): number {
  return positions.filter((p) => p.current && p.listed && BOARD_SEATS.includes(p.role)).length + (here ? 1 : 0);
}
