"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import type { ActionState } from "@/components/ui/form";
import { partyOf } from "@/lib/requirements";
import { sendRequirements } from "../_actions/requirements";
import { partyName, type Target } from "./agenda-targets";
import { RequestMails, type RequestMail, type RequirementRow } from "./requirements-panel";

const solid = "motion-press inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90 disabled:opacity-50";

/** Sends one item's or one party's drafts; nothing sends the whole meeting at once. */
export function SendButton({ meetingId, scope, label }: { meetingId: string; scope: { item: string } | { party: string }; label: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setState(await sendRequirements(meetingId, scope)))} className={solid}>
        <Send size={13} aria-hidden="true" /> {pending ? "جارٍ الإرسال…" : label}
      </button>
      {!pending && state && <span className={state.ok ? "text-xs text-primary" : "text-xs text-danger"}>{state.message}</span>}
    </span>
  );
}

/** Drafts grouped by who receives them; each party gets only its own requests, sent with its own button. */
export function SendByParty({ meetingId, rows, targets, items, sentAt, mails = [] }: { meetingId: string; rows: RequirementRow[]; targets: Target[]; items: { id: string; position: number }[]; sentAt: string | null; mails?: RequestMail[] }) {
  const pending = rows.filter((r) => r.status === "draft" || r.obsolete);
  if (!rows.length) return null;
  if (!pending.length)
    return (
      <div className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs text-primary">
          <Check size={14} aria-hidden="true" /> أُرسلت كل الطلبات، كلٌّ إلى جهته{sentAt ? ` (آخر إرسال ${sentAt.slice(0, 10)})` : ""}.
        </p>
        <RequestMails mails={mails} />
      </div>
    );

  const groups = new Map<string, RequirementRow[]>();
  for (const r of pending) groups.set(partyOf(r), [...(groups.get(partyOf(r)) ?? []), r]);
  const order = [...groups.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0));
  const itemNo = (id: string) => items.find((i) => i.id === id)?.position;

  return (
    <details id="send-requirements" className="group/send scroll-mt-24 rounded-lg border border-brass bg-surface text-sm" open>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
        <strong className="min-w-0 flex-1">طلبات لم تُرسل: {pending.length}</strong>
        <span className="text-xs text-ink-muted">كل جهة يصلها ما يخصها فقط</span>
      </summary>
      <ul className="divide-y divide-rule border-t border-rule">
        {order.map((party) => {
          const list = groups.get(party)!;
          const name = partyName(party, targets);
          return (
            <li key={party || "none"} className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className={party ? "min-w-0 flex-1" : "min-w-0 flex-1 text-danger"}>
                  {name} <span className="font-mono text-xs font-normal text-ink-muted">({list.length})</span>
                </strong>
                {party ? (
                  <SendButton meetingId={meetingId} scope={{ party }} label={party === "check" ? "فعّل التحققات" : `أرسل إلى ${name}`} />
                ) : (
                  <span className="text-xs text-danger">حدّد الجهة من «متطلبات البند»</span>
                )}
              </div>
              <ul className="ms-4 list-disc text-xs leading-6 text-ink-muted">
                {list.map((r) => (
                  <li key={r.id}>
                    {itemNo(r.agenda_item_id) !== undefined && <span className="font-mono text-brass">البند {itemNo(r.agenda_item_id)} · </span>}
                    {r.label}
                    {r.obsolete ? " · للسحب" : r.due_date ? ` · حتى ${r.due_date}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
