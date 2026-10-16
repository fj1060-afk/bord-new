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

const DUE_AR: Record<ReqDue, string> = { immediate: "فوراً", "5d": "خلال 5 أيام", "15d": "خلال 15 يوماً", "30d": "خلال 30 يوماً", "15bd": "خلال 15 يوم عمل", before_ga: "قبل الجمعية العامة", "60d": "خلال 60 يوماً", "180d": "خلال 180 يوماً" };
const DUE_EN: Record<ReqDue, string> = { immediate: "immediately", "5d": "within 5 days", "15d": "within 15 days", "30d": "within 30 days", "15bd": "within 15 business days", before_ga: "before the General Assembly", "60d": "within 60 days", "180d": "within 180 days" };
const FROM_EN: Record<ReqFrom, string> = { owner: "the item owner", finance: "Finance", legal: "Legal", hr: "Human Resources", ir: "Investor Relations", audit: "the Audit Committee", nrc: "the Nomination & Remuneration Committee", risk: "the Risk Committee", secretary: "the board secretary" };

/** Who provides a before-meeting requirement, as a heading. */
function provider(r: Req, en: boolean) {
  if (r.k === "check") return en ? "Confirmed by the board secretary" : "يتحقق منه أمين السر";
  if (!r.from) return en ? "Assigned by the board secretary" : "يحدد أمين السر المطلوب منه";
  return en ? `From ${FROM_EN[r.from]}` : `من ${REQ_FROM[r.from]}`;
}

/**
 * The requirements block written into an item's description: the follow-up
 * actions with their owner and deadline. Before-meeting requirements live in
 * the item's requirements panel, so they are written only when asked for.
 */
export function requirementsText(reqs: Req[] = [], en = false, withBefore = false): string {
  if (!reqs.length) return "";
  const groups = new Map<string, string[]>();
  for (const r of beforeMeeting(reqs)) groups.set(provider(r, en), [...(groups.get(provider(r, en)) ?? []), en ? r.en : r.ar]);
  const lines = [...groups].map(([who, list]) => `• ${who}: ${list.join(en ? "; " : "؛ ")}`);
  const after = reqs.filter((r) => r.k === "after");
  const out: string[] = [];
  if (withBefore && lines.length) out.push(en ? "Before the meeting:" : "المتطلبات قبل الاجتماع:", ...lines);
  if (after.length) {
    out.push(en ? "After the resolution:" : "بعد القرار:");
    for (const r of after) {
      const meta = [r.from ? (en ? FROM_EN[r.from] : REQ_FROM[r.from]) : "", r.due ? (en ? DUE_EN[r.due] : DUE_AR[r.due]) : ""].filter(Boolean).join(en ? ", " : "، ");
      out.push(`• ${en ? r.en : r.ar}${meta ? ` (${meta})` : ""}`);
    }
  }
  return out.join("\n");
}

/** Removes an auto-filled requirements block (current or older format) from a description. */
export const withoutRequirements = (description: string) =>
  description
    .split("\n")
    .filter((l) => !/^(المستندات الداعمة:|المتطلبات قبل الاجتماع:|بعد القرار:|•\s)/.test(l.trim()))
    .join("\n");

/** Whether a description is nothing but an auto-filled block (so it may follow the title). */
export const isRequirementsOnly = (description: string) => !!description.trim() && !withoutRequirements(description).trim();

/** Drops a "before the meeting" block (Arabic or English) from a description; the requirements panel shows it instead. */
export function withoutBeforeMeeting(description: string): string {
  const out: string[] = [];
  let skipping = false;
  for (const line of description.split("\n")) {
    const t = line.trim();
    if (/^(المتطلبات قبل الاجتماع:|Before the meeting:)/.test(t)) {
      skipping = true;
      continue;
    }
    if (t.startsWith("المستندات الداعمة:")) continue; // the older one-line form
    if (skipping && (!t || t.startsWith("•"))) continue;
    skipping = false;
    out.push(line);
  }
  return out.join("\n").trim();
}
