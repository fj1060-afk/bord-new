// Board members' declarations besides the yearly conflict disclosure, and the
// 5% ownership notice to the Exchange, whose fields follow Tadawul's form.

export const DECLARATIONS = {
  competition: { label: "إقرار المنافسة", ref: "نظام الشركات م27/2" },
  independence: { label: "إقرار الاستقلال", ref: "لائحة حوكمة الشركات م19" },
  other_boards: { label: "العضويات في مجالس أخرى", ref: "لائحة حوكمة الشركات م17/ج" },
  ownership_notice: { label: "إشعار ملكية 5% أو تغيّرها", ref: "قواعد طرح الأوراق المالية والالتزامات المستمرة م85" },
} as const;
export type DeclarationKind = keyof typeof DECLARATIONS;

/** What negates independence (CGR Art. 19/c), as the member ticks them. */
export const INDEPENDENCE_ISSUES = [
  "يملك 5% أو أكثر من أسهم الشركة أو شركة في مجموعتها، أو قريبه يملك ذلك.",
  "قريب لعضو في مجلس الشركة أو مجلس شركة في مجموعتها.",
  "قريب لأحد كبار التنفيذيين في الشركة أو في شركة في مجموعتها.",
  "عضو مجلس في شركة ضمن مجموعة الشركة.",
  "موظف في الشركة أو مجموعتها، أو كان كذلك خلال السنتين السابقتين، أو له حصة سيطرة في الشركة أو في جهة تتعامل معها خلال السنتين السابقتين.",
  "له مصلحة مباشرة أو غير مباشرة في الأعمال والعقود التي تتم لحساب الشركة.",
  "يتقاضى من الشركة مبالغ غير مكافأة العضوية تزيد على 200,000 ريال أو 50% من مكافأته في السنة السابقة، أيهما أقل.",
  "يشترك في عمل ينافس الشركة أو يتجّر في أحد فروع نشاطها.",
  "أمضى أكثر من تسع سنوات متصلة أو منفصلة عضواً في مجلس الشركة.",
] as const;

export type Holding = { name: string; id: string; relation: string; shares: string; percent: string; reason?: string };

export type OwnershipNotice = {
  type: "holder" | "change";
  name: string;
  id: string;
  issuer: string;
  direct: { shares: string; percent: string };
  relatives: boolean;
  controlled: boolean;
  concert: boolean;
  interests: Holding[];
  before: { shares: string; percent: string };
  after: { shares: string; percent: string };
  changes: Holding[];
  acquisition: string;
  funding: string;
  phone: string;
  email: string;
  noticeDate: string;
  eventDate: string;
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pct = (v: unknown) => {
  const s = str(v, 12).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace("%", "");
  return s && Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= 100 ? s : "";
};
const holdings = (v: unknown, withReason: boolean): Holding[] =>
  (Array.isArray(v) ? v : [])
    .map((h) => ({ name: str(h?.name), id: str(h?.id, 40), relation: str(h?.relation, 80), shares: str(h?.shares, 60), percent: pct(h?.percent), ...(withReason ? { reason: str(h?.reason, 120) } : {}) }))
    .filter((h) => h.name)
    .slice(0, 12);

/** The notice from submitted JSON, cleaned; null when its essentials are missing. */
export function parseOwnershipNotice(raw: unknown): OwnershipNotice | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pair = (v: unknown) => ({ shares: str((v as Record<string, unknown>)?.shares, 60), percent: pct((v as Record<string, unknown>)?.percent) });
  const n: OwnershipNotice = {
    type: r.type === "change" ? "change" : "holder",
    name: str(r.name),
    id: str(r.id, 40),
    issuer: str(r.issuer),
    direct: pair(r.direct),
    relatives: r.relatives === true,
    controlled: r.controlled === true,
    concert: r.concert === true,
    interests: holdings(r.interests, false),
    before: pair(r.before),
    after: pair(r.after),
    changes: holdings(r.changes, true),
    acquisition: str(r.acquisition, 120),
    funding: str(r.funding, 120),
    phone: str(r.phone, 40),
    email: str(r.email, 120),
    noticeDate: /^\d{4}-\d{2}-\d{2}$/.test(str(r.noticeDate)) ? str(r.noticeDate) : "",
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(str(r.eventDate)) ? str(r.eventDate) : "",
  };
  if (!n.name || !n.id || !n.issuer || !n.eventDate) return null;
  return n;
}

/** Total of direct and interested holdings, as the form's field 5 (3 + 4). */
export function totalPercent(n: OwnershipNotice): string {
  const sum = [n.direct.percent, ...n.interests.map((h) => h.percent)].reduce((s, p) => s + (Number(p) || 0), 0);
  return sum ? String(Math.round(sum * 1000) / 1000) : "";
}

/** The Exchange expects the notice by the end of the third trading day after the event (Sunday to Thursday). */
export function noticeDeadline(eventDate: string): string {
  let t = Date.parse(`${eventDate}T12:00:00Z`);
  let left = 3;
  while (left > 0) {
    t += 86400000;
    const d = new Date(t).getUTCDay();
    if (d !== 5 && d !== 6) left--;
  }
  return new Date(t).toISOString().slice(0, 10);
}
