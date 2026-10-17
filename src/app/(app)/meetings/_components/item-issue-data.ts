import type { Check, Target } from "@/lib/journey";

// Open journey checks regrouped per agenda item, shown inside each item (server and client safe).

export type QuickFixKind = { kind: "owner" | "due" | "send" | "edit" | "below"; suggest?: { value: string; label: string } };
export type Issue = { id: string; level: "block" | "warn" | "info"; chip: string; explain: string; overridable: boolean; fix?: QuickFixKind };
export type IssueItem = { anchor: string; n?: number; label: string; issues: Issue[] };

export const tone = (c: Check) => (c.overridden || c.level === "info" ? "info" : c.level);

/** The short title an item shows for a check, e.g. "بلا مسؤول" or "4 لم تُرسل". */
function chipFor(c: Check, t: Target): string {
  const n = t.count ?? 0;
  switch (c.id) {
    case "owners": return "بلا مسؤول";
    case "definite": return "عنوان غير محدد";
    case "requirements-sent": return n ? `${n} متطلبات لم تُرسل` : "متطلبات لم تُرسل";
    case "requirements-checks": return n > 1 ? `${n} تحقق معلّق` : "تحقق معلّق";
    case "docs": return n > 1 ? `${n} مستندات بانتظار` : "مستند بانتظار";
    case "periods": return "فترة لم تنتهِ";
    case "item-dates": return "تاريخ غير متسق";
    case "requirements-due": return n > 1 ? `${n} مواعيد خارج المدة` : "موعد خارج المدة";
    default: return c.fix?.label ?? c.label;
  }
}

/** The one-click fix offered; checks fixed in the item's form open it, ones fixed further down point there. */
function fixFor(c: Check, t: Target): QuickFixKind {
  switch (c.id) {
    case "owners": return { kind: "owner", suggest: t.suggest };
    case "requirements-due": return { kind: "due", suggest: t.suggest };
    case "requirements-sent": return { kind: "send" };
    case "docs":
    case "requirements-checks": return { kind: "below" };
    default: return { kind: "edit" };
  }
}

/** What is wrong with the item and what to do about it, in plain words. */
function explainFor(c: Check, t: Target): string {
  const n = t.count ?? 0;
  switch (c.id) {
    case "owners": return "لا توجد جهة مسؤولة عن البند. حدّدها لتتابعه وتعرضه في الاجتماع.";
    case "requirements-sent": return `${n || "بعض"} متطلبات محفوظة مسودةً ولم تصل إلى أحد بعد. أرسلها لتصل إلى الإدارات المطلوبة منها.`;
    case "requirements-due": return `مواعيد ${n > 1 ? `${n} متطلبات` : "متطلب"} فاتت أو تقع بعد الاجتماع. اضبطها على موعد قبل الاجتماع.`;
    case "definite": return "العنوان فيه خيارات «/» أو فراغ «(…)». اختر صيغة واحدة وأكمل الفراغ.";
    case "periods": return "البند يعتمد قوائم أو أرباح فترة لا تنتهي قبل تاريخ الاجتماع. صحّح الفترة في العنوان.";
    case "item-dates": return `${t.note ? `${t.note}. ` : ""}صحّح التاريخ في عنوان البند.`;
    case "docs": return `${n > 1 ? `${n} مستندات لم تُسلَّم` : "مستند لم يُسلَّم"} أو لم يُعتمد بعد. تابعه في مستندات البند أدناه.`;
    case "requirements-checks": return `تحققات لم تُؤكَّد بعد${c.detail ? ` (${c.detail.replace(/^بانتظار: /, "")})` : ""}. أكّدها في متطلبات البند أدناه.`;
    default: return [c.label, t.note].filter(Boolean).join(": ");
  }
}

/** Open checks that name items, regrouped per item so each item shows once, worst first. */
export function itemIssues(checks: Check[]): IssueItem[] {
  const items = new Map<string, IssueItem>();
  for (const c of checks.filter((c) => !c.ok && !c.overridden))
    for (const t of c.fix?.targets ?? []) {
      const item = items.get(t.anchor) ?? { anchor: t.anchor, n: t.n, label: t.label, issues: [] };
      const explain = explainFor(c, t) + (c.ref ? ` (${c.ref})` : "");
      item.issues.push({ id: c.id, level: tone(c), chip: chipFor(c, t), explain, overridable: c.level === "warn", fix: fixFor(c, t) });
      items.set(t.anchor, item);
    }
  const rank = { block: 0, warn: 1, info: 2 };
  return [...items.values()].map((i) => ({ ...i, issues: i.issues.sort((a, b) => rank[a.level] - rank[b.level]) })).sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
}

/** The issues that need someone to act (warnings and blockers), and the worst of them. */
export function needsAction(issues: Issue[]): { count: number; level: "block" | "warn" | null } {
  const acting = issues.filter((i) => i.level !== "info");
  return { count: acting.length, level: acting.some((i) => i.level === "block") ? "block" : acting.length ? "warn" : null };
}
