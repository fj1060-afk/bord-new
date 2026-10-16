// Item requirements as actions: a document or a committee recommendation
// requested from someone, a check the secretary confirms, or (after the
// resolution) a follow-up action with a statutory deadline.

/** doc: a document requested; rec: a committee recommendation; check: confirmed by the secretary; after: follow-up once resolved. */
export type ReqKind = "doc" | "rec" | "check" | "after";
/** Who provides it: the item owner, a function (resolved to a department by name), a committee, or the secretary. */
export type ReqFrom = "owner" | "finance" | "legal" | "hr" | "ir" | "audit" | "nrc" | "risk" | "secretary";
/** When a follow-up action is due, counted from the resolution. */
export type ReqDue = "immediate" | "5d" | "15d" | "30d" | "15bd" | "before_ga" | "60d" | "180d";

export type Req = { k: ReqKind; ar: string; en: string; from?: ReqFrom; auto?: "conflict"; due?: ReqDue };

export const REQ_KINDS: Record<ReqKind, string> = { doc: "مستند", rec: "توصية لجنة", check: "تحقق", after: "إجراء بعد القرار" };

export const REQ_FROM: Record<ReqFrom, string> = {
  owner: "المسؤول عن البند",
  finance: "الإدارة المالية",
  legal: "الإدارة القانونية",
  hr: "الموارد البشرية",
  ir: "علاقات المستثمرين",
  audit: "لجنة المراجعة",
  nrc: "لجنة الترشيحات والمكافآت",
  risk: "لجنة المخاطر",
  secretary: "أمين السر",
};

/** Requirements handled before the meeting (documents, recommendations, checks). */
export const beforeMeeting = (reqs: Req[] = []) => reqs.filter((r) => r.k !== "after");

/** The supporting-documents line written into an item's description. */
export const needsText = (reqs: Req[] = []) => beforeMeeting(reqs).map((r) => r.ar).join("؛ ");
export const needsTextEn = (reqs: Req[] = []) => beforeMeeting(reqs).map((r) => r.en).join("; ");

/** A stored requirement row, as far as syncing and sending need it. */
export type ReqRow = { id: string; label: string; kind: string; custom: boolean; status: "draft" | "sent" | "dismissed"; department_id: string | null; assignee_user_id: string | null };

/**
 * Brings an item's requirement rows in line with its standard wording:
 * missing ones are drafted; drafts no longer required are removed; sent ones
 * no longer required are reported as obsolete (the secretary decides);
 * dismissed and hand-added rows are left alone.
 */
export function planSync(wanted: Req[], rows: ReqRow[]) {
  const pre = beforeMeeting(wanted);
  const labels = new Set(pre.map((r) => r.ar));
  const have = new Set(rows.map((r) => r.label));
  const stale = rows.filter((r) => !r.custom && !labels.has(r.label));
  return {
    insert: pre.map((r, position) => ({ ...r, position })).filter((r) => !have.has(r.ar)),
    remove: stale.filter((r) => r.status === "draft").map((r) => r.id),
    obsolete: stale.filter((r) => r.status === "sent").map((r) => r.id),
  };
}

/** Drafts that cannot be sent yet: documents and recommendations with nobody to ask. */
export const unassigned = (rows: ReqRow[]) => rows.filter((r) => r.status === "draft" && r.kind !== "check" && !r.department_id && !r.assignee_user_id);

/** Department for a function, matched by name (e.g. "الإدارة المالية"). */
const FUNCTION_NAMES: Partial<Record<ReqFrom, RegExp>> = {
  finance: /مال|محاسب|finance/i,
  legal: /قانون|شؤون قانونية|legal/i,
  hr: /موارد بشرية|الموارد البشرية|شؤون الموظفين|hr/i,
  ir: /علاقات المستثمرين|investor/i,
};
export function departmentFor(from: ReqFrom | undefined, departments: { id: string; name: string }[]) {
  const pattern = from ? FUNCTION_NAMES[from] : undefined;
  return pattern ? (departments.find((d) => pattern.test(d.name))?.id ?? null) : null;
}
