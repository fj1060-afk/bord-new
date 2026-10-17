"use client";

import { CalendarDays, CheckSquare, ChevronDown, FileText, Landmark, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { REQ_KINDS } from "@/lib/requirements";
import { addRequirement, confirmCheck, sendRequirements, setRequirementStatus, setRequirementTarget } from "../_actions/requirements";
import { TargetSelect } from "./agenda-forms";
import { MailButton } from "./outlook-buttons";
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
export function RequirementsPanel({ meetingId, itemId, rows, targets, dueDefault, send }: { meetingId: string; itemId: string; rows: RequirementRow[]; targets: Target[]; dueDefault: string; send?: React.ReactNode }) {
  const drafts = rows.filter((r) => r.status === "draft" && r.kind !== "check");
  const checks = rows.filter((r) => r.kind === "check" && r.status !== "dismissed");
  const obsolete = rows.filter((r) => r.obsolete);
  const dismissed = rows.filter((r) => r.status === "dismissed");
  const sent = rows.filter((r) => r.status === "sent" && r.kind !== "check" && !r.obsolete).length;
  if (!rows.length)
    return (
      <>
        <AddRequirement meetingId={meetingId} itemId={itemId} targets={targets} dueDefault={dueDefault} />
        {send}
      </>
    );

  const summary = [drafts.length > 0 && `${drafts.length} مسودة`, sent > 0 && `${sent} مُرسلة`, checks.length > 0 && `${checks.filter((c) => c.checked_at).length}/${checks.length} تحقق`].filter(Boolean).join(" · ");
  const unassigned = drafts.filter((r) => !targetOf(r)).length;

  return (
    <>
      <details className="group/req rounded-md border border-rule text-sm" open={unassigned > 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
          <strong className="min-w-0 flex-1">متطلبات البند</strong>
          {unassigned > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] text-danger">{unassigned} بلا جهة</span>}
          <span className="text-xs text-ink-muted">{summary}</span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/req:rotate-180" />
        </summary>
        <div className="flex flex-col gap-2 border-t border-rule p-3">
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
      </details>
      {send}
    </>
  );
}

function DraftRow({ meetingId, row, targets }: { meetingId: string; row: RequirementRow; targets: Target[] }) {
  const Icon = ICONS[row.kind];
  const [pending, start] = useTransition();
  const save = (target: string, due: string | null) => start(() => setRequirementTarget(meetingId, row.id, target, due));
  const missing = !targetOf(row);
  return (
    <div className={`flex flex-col gap-2 rounded-md border bg-paper p-3 transition-opacity ${missing ? "border-danger/40" : "border-transparent"} ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <Icon size={15} className="mt-0.5 shrink-0 text-primary" aria-label={REQ_KINDS[row.kind]} />
        <span className="min-w-0 flex-1 font-medium">{row.label}</span>
        <form action={setRequirementStatus.bind(null, meetingId, row.id, "dismissed")} className="shrink-0">
          <button disabled={pending} title="استبعاد هذا المتطلب" aria-label={`استبعاد ${row.label}`} className="grid size-7 place-items-center rounded text-ink-muted hover:bg-danger/10 hover:text-danger">
            <X size={15} aria-hidden="true" />
          </button>
        </form>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
        <div onChange={(e) => save((e.target as unknown as HTMLSelectElement).value, row.due_date)}>
          <TargetSelect name={`t-${row.id}`} targets={targets} defaultValue={targetOf(row)} placeholder="المطلوب منه؟" />
        </div>
        <label className="relative">
          <span className="sr-only">آخر موعد</span>
          <CalendarDays size={15} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-muted" />
          <input type="date" lang="ar" defaultValue={row.due_date ?? ""} onChange={(e) => save(targetOf(row), e.target.value)} className={`${inputClass} ps-9`} />
        </label>
      </div>
      {missing && <span className="text-xs text-danger">حدّد المطلوب منه قبل الإرسال.</span>}
    </div>
  );
}

function CheckRow({ meetingId, row }: { meetingId: string; row: RequirementRow }) {
  const [note, setNote] = useState(row.note ?? "");
  const [pending, start] = useTransition();
  const checked = !!row.checked_at;
  return (
    <div className="grid gap-2 rounded bg-paper p-2 md:grid-cols-[1fr_14rem_auto] md:items-center">
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={checked} disabled={pending} onChange={(e) => start(() => confirmCheck(meetingId, row.id, e.target.checked, note))} className="mt-1 shrink-0" />
        <span className={checked ? "text-primary" : ""}>{row.label}</span>
      </label>
      {checked ? <span className="text-xs text-ink-muted">{row.note}</span> : <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className={inputClass} />}
      {row.status === "draft" ? (
        <form action={setRequirementStatus.bind(null, meetingId, row.id, "dismissed")} className="justify-self-end">
          <button className="px-1 py-2 text-xs text-ink-muted hover:text-danger">استبعاد</button>
        </form>
      ) : (
        <span />
      )}
    </div>
  );
}

function AddRequirement({ meetingId, itemId, targets, dueDefault }: { meetingId: string; itemId: string; targets: Target[]; dueDefault: string }) {
  const [state, action] = useActionState(addRequirement.bind(null, meetingId, itemId), null);
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-primary">إضافة متطلب</summary>
      <ActionForm action={action} state={state} className="mt-2 grid gap-2 md:grid-cols-4">
        <input name="label" required placeholder="المتطلب" className={`${inputClass} md:col-span-4`} />
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
        <div className="md:col-span-4">
          <FormMessage state={state} />
        </div>
      </ActionForm>
    </details>
  );
}

export type RequestMail = { name: string; to: string[]; subject: string; body: string };

/** After sending: one ready email per recipient, opened in Outlook. */
function RequestMails({ mails }: { mails: RequestMail[] }) {
  if (!mails.length) return null;
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-primary">رسائل الطلبات عبر Outlook ({mails.length})</summary>
      <ul className="mt-2 flex flex-col gap-2">
        {mails.map((m) => (
          <li key={m.name + m.subject} className="flex flex-wrap items-center justify-between gap-2 rounded bg-paper p-2">
            <span>
              {m.name}
              <span className="block text-xs text-ink-muted" dir="ltr">
                {m.to.join(", ")}
              </span>
            </span>
            <MailButton to={m.to} subject={m.subject} body={m.body} label="فتح الرسالة" />
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The meeting-wide review and send step: one action sends every drafted requirement. */
export function SendRequirementsBar({ meetingId, rows, targets, sentAt, mails = [] }: { meetingId: string; rows: RequirementRow[]; targets: Target[]; sentAt: string | null; mails?: RequestMail[] }) {
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
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-primary">✓ أُرسلت طلبات المتطلبات{sentAt ? ` في ${sentAt.slice(0, 10)}` : ""}، ولا تغييرات جديدة.</p>
        <RequestMails mails={mails} />
      </div>
    );

  return (
    <div id="send-requirements" className="flex scroll-mt-24 flex-col gap-3 rounded-lg border border-brass bg-surface p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>
          {sentAt ? "تحديثات لم تُرسل" : "طلبات المتطلبات لم تُرسل بعد"}: {drafts.length} جديد{obsolete.length ? ` · ${obsolete.length} للسحب` : ""}
        </strong>
        <span className="text-xs text-ink-muted">للاجتماع كاملاً؛ لا يُرسل شيء عند حفظ البنود.</span>
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
