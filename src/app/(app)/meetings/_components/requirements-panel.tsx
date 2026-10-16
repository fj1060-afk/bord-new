"use client";

import { CheckSquare, FileText, Landmark } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { REQ_KINDS } from "@/lib/requirements";
import { addRequirement, confirmCheck, sendRequirements, setRequirementStatus, setRequirementTarget } from "../_actions/requirements";
import { TargetSelect } from "./agenda-forms";
import type { Target } from "./agenda-targets";

export type RequirementRow = {
  id: string;
  agenda_item_id: string;
  kind: "doc" | "rec" | "check";
  label: string;
  status: "draft" | "sent" | "dismissed";
  custom: boolean;
  department_id: string | null;
  assignee_user_id: string | null;
  due_date: string | null;
  checked_at: string | null;
  note: string | null;
  obsolete: boolean;
};

const ICONS = { doc: FileText, rec: Landmark, check: CheckSquare };
const targetOf = (r: RequirementRow) => (r.department_id ? `department:${r.department_id}` : r.assignee_user_id ? `user:${r.assignee_user_id}` : "");

/** An item's requirements: drafts to adjust before sending, checks to confirm, and changes still to send. */
export function RequirementsPanel({ meetingId, itemId, rows, targets, dueDefault }: { meetingId: string; itemId: string; rows: RequirementRow[]; targets: Target[]; dueDefault: string }) {
  const drafts = rows.filter((r) => r.status === "draft" && r.kind !== "check");
  const checks = rows.filter((r) => r.kind === "check" && r.status !== "dismissed");
  const obsolete = rows.filter((r) => r.obsolete);
  const dismissed = rows.filter((r) => r.status === "dismissed");
  const sent = rows.filter((r) => r.status === "sent" && r.kind !== "check" && !r.obsolete).length;
  if (!rows.length) return <AddRequirement meetingId={meetingId} itemId={itemId} targets={targets} dueDefault={dueDefault} />;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-rule p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>متطلبات البند</strong>
        <span className="text-xs text-ink-muted">
          {[
            drafts.length > 0 && `${drafts.length} مسودة لم تُرسل`,
            sent > 0 && `${sent} مُرسلة (طلباتها أعلاه)`,
            checks.length > 0 && `${checks.filter((c) => c.checked_at).length}/${checks.length} تحقق مؤكد`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      {drafts.map((r) => (
        <DraftRow key={r.id} meetingId={meetingId} row={r} targets={targets} />
      ))}
      {checks.map((r) => (
        <CheckRow key={r.id} meetingId={meetingId} row={r} />
      ))}
      {obsolete.map((r) => (
        <p key={r.id} className="rounded bg-brass-soft px-2 py-1 text-xs text-brass">
          «{r.label}» لم يعد مطلوباً بعد تغيير البند؛ يُسحب طلبه عند إرسال التحديثات ما لم يُسلَّم.
        </p>
      ))}
      {dismissed.length > 0 && (
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer">مستبعدة لهذا البند ({dismissed.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {dismissed.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="line-through">{r.label}</span>
                <form action={setRequirementStatus.bind(null, meetingId, r.id, "draft")}>
                  <button className="text-primary hover:underline">استعادة</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
      <AddRequirement meetingId={meetingId} itemId={itemId} targets={targets} dueDefault={dueDefault} />
    </div>
  );
}

function DraftRow({ meetingId, row, targets }: { meetingId: string; row: RequirementRow; targets: Target[] }) {
  const Icon = ICONS[row.kind];
  const [pending, start] = useTransition();
  const save = (target: string, due: string | null) => start(() => setRequirementTarget(meetingId, row.id, target, due));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded bg-paper p-2">
      <Icon size={14} className="text-ink-muted" aria-label={REQ_KINDS[row.kind]} />
      <span className="min-w-40 flex-1">{row.label}</span>
      <div className="w-56" onChange={(e) => save((e.target as unknown as HTMLSelectElement).value, row.due_date)}>
        <TargetSelect name={`t-${row.id}`} targets={targets} defaultValue={targetOf(row)} placeholder="المطلوب منه؟" />
      </div>
      <div className="w-40">
        <input type="date" aria-label="آخر موعد" defaultValue={row.due_date ?? ""} onChange={(e) => save(targetOf(row), e.target.value)} className={inputClass} />
      </div>
      <form action={setRequirementStatus.bind(null, meetingId, row.id, "dismissed")}>
        <button disabled={pending} className="text-xs text-ink-muted hover:text-danger">
          استبعاد
        </button>
      </form>
      {!targetOf(row) && <span className="w-full text-xs text-danger">حدّد المطلوب منه قبل الإرسال.</span>}
    </div>
  );
}

function CheckRow({ meetingId, row }: { meetingId: string; row: RequirementRow }) {
  const [note, setNote] = useState(row.note ?? "");
  const [pending, start] = useTransition();
  const checked = !!row.checked_at;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded bg-paper p-2">
      <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => start(() => confirmCheck(meetingId, row.id, e.target.checked, note))} aria-label="تأكيد" />
      <span className={`min-w-40 flex-1 ${checked ? "text-primary" : ""}`}>{row.label}</span>
      {!checked && (
        <div className="w-56">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className={inputClass} />
        </div>
      )}
      {checked && row.note && <span className="text-xs text-ink-muted">{row.note}</span>}
      {row.status === "draft" && (
        <form action={setRequirementStatus.bind(null, meetingId, row.id, "dismissed")}>
          <button className="text-xs text-ink-muted hover:text-danger">استبعاد</button>
        </form>
      )}
    </div>
  );
}

function AddRequirement({ meetingId, itemId, targets, dueDefault }: { meetingId: string; itemId: string; targets: Target[]; dueDefault: string }) {
  const [state, action] = useActionState(addRequirement.bind(null, meetingId, itemId), null);
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-primary">إضافة متطلب</summary>
      <ActionForm action={action} state={state} className="mt-2 grid gap-2 sm:grid-cols-4">
        <input name="label" required placeholder="المتطلب" className={`${inputClass} sm:col-span-4`} />
        <select name="kind" defaultValue="doc" className={inputClass}>
          {(["doc", "rec", "check"] as const).map((k) => (
            <option key={k} value={k}>
              {REQ_KINDS[k]}
            </option>
          ))}
        </select>
        <TargetSelect name="target" targets={targets} placeholder="المطلوب منه" />
        <input name="due_date" type="date" defaultValue={dueDefault} aria-label="آخر موعد" className={inputClass} />
        <SubmitButton pendingLabel="…" className="w-fit">
          إضافة
        </SubmitButton>
        <div className="sm:col-span-4">
          <FormMessage state={state} />
        </div>
      </ActionForm>
    </details>
  );
}

/** The meeting-wide review and send step: one action sends every drafted requirement. */
export function SendRequirementsBar({ meetingId, rows, targets, sentAt }: { meetingId: string; rows: RequirementRow[]; targets: Target[]; sentAt: string | null }) {
  const [state, action] = useActionState(sendRequirements.bind(null, meetingId), null);
  const drafts = rows.filter((r) => r.status === "draft");
  const obsolete = rows.filter((r) => r.obsolete);
  if (!rows.length) return null;
  const pendingChanges = drafts.length + obsolete.length;
  const name = (r: RequirementRow) => targets.find((t) => t.value === targetOf(r))?.label ?? (r.kind === "check" ? "أمين السر (تحقق)" : "غير محدد");
  const groups = Object.entries(
    drafts.reduce<Record<string, RequirementRow[]>>((acc, r) => {
      (acc[name(r)] ??= []).push(r);
      return acc;
    }, {}),
  );

  if (!pendingChanges)
    return <p className="rounded-lg border border-rule bg-surface p-4 text-sm text-primary">✓ أُرسلت طلبات المتطلبات{sentAt ? ` في ${sentAt.slice(0, 10)}` : ""}، ولا تغييرات جديدة.</p>;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brass bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>
          {sentAt ? "تحديثات لم تُرسل" : "طلبات المتطلبات لم تُرسل بعد"}: {drafts.length} جديد{obsolete.length ? ` · ${obsolete.length} للسحب` : ""}
        </strong>
        <span className="text-xs text-ink-muted">لا يُرسل شيء عند حفظ البنود؛ راجع ثم أرسل مرة واحدة.</span>
      </div>
      <details>
        <summary className="w-fit cursor-pointer text-primary">مراجعة حسب المطلوب منه</summary>
        <ul className="mt-2 flex flex-col gap-2">
          {groups.map(([who, list]) => (
            <li key={who} className="rounded bg-paper p-2">
              <strong className={who === "غير محدد" ? "text-danger" : ""}>{who}</strong> ({list.length})
              <ul className="ms-4 list-disc text-ink-muted">
                {list.map((r) => (
                  <li key={r.id}>
                    {r.label}
                    {r.due_date && ` · حتى ${r.due_date}`}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
      <ActionForm action={action} state={state} className="flex flex-col gap-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الإرسال…" className="w-fit">
          {sentAt ? "إرسال التحديثات" : "إرسال طلبات المتطلبات"}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
