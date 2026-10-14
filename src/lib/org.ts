// Labels and rules for the organization structure (board, committees, disclosures).

export const BOARD_POSITIONS = { chair: "رئيس المجلس", vice_chair: "نائب الرئيس", member: "عضو" } as const;
export const BOARD_CATEGORIES = { independent: "مستقل", non_executive: "غير تنفيذي", executive: "تنفيذي" } as const;
export const COMMITTEE_POSITIONS = { chair: "رئيس اللجنة", member: "عضو", secretary: "أمين اللجنة" } as const;

export type BoardPosition = keyof typeof BOARD_POSITIONS;
export type BoardCategory = keyof typeof BOARD_CATEGORIES;
export type CommitteePosition = keyof typeof COMMITTEE_POSITIONS;

const POSITION_ORDER: Record<string, number> = { chair: 0, vice_chair: 1, secretary: 2, member: 3 };

/** Chair first, then vice chair and secretary, then members by name. */
export function sortByPosition<T extends { position: string; name: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9) ||
      a.name.localeCompare(b.name, "ar"),
  );
}

export function isOneOf<T extends string>(value: unknown, options: Record<T, string>): value is T {
  return typeof value === "string" && Object.hasOwn(options, value);
}

/** The current year in Saudi time; disclosures are filed per calendar year. */
export function currentYear(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-u-nu-latn", { year: "numeric", timeZone: "Asia/Riyadh" }).format(now));
}

/** Maps a Postgres unique-violation on a membership to a readable message. */
export function membershipError(code: string | undefined, message: string | undefined): string {
  if (code === "23505") {
    if (message?.includes("one_chair")) return "هذا المنصب مشغول. أنهِ عضوية شاغله أولاً.";
    if (message?.includes("one_active")) return "هذا الشخص عضو نشط بالفعل.";
  }
  if (code === "23514") return "تحقق من التواريخ: تاريخ النهاية يجب أن يكون بعد البداية.";
  return "تعذّر الحفظ. أعد المحاولة.";
}
