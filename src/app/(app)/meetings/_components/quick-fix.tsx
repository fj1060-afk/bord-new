"use client";

import { useState, useTransition } from "react";
import { ArrowDown, Pencil, Send, Wand2 } from "lucide-react";
import type { ActionState } from "@/components/ui/form";
import { inputWith } from "@/components/ui/styles";
import { setItemDueDates, setItemOwner } from "../_actions/quick-fixes";
import { sendRequirements } from "../_actions/requirements";
import { editItem } from "./edit-item-event";
import type { QuickFixKind } from "./item-issue-data";

const solid = "motion-press inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90 disabled:opacity-50";
const plain = "motion-press inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-1 text-xs hover:border-primary disabled:opacity-50";

/** The one-click fix an issue offers: the suggested owner or deadline, sending, or the item's edit form. */
export function QuickFix({ meetingId, itemId, fix }: { meetingId: string; itemId: string; fix: QuickFixKind }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);
  const [date, setDate] = useState(fix.suggest?.value ?? "");
  const run = (act: () => Promise<ActionState>) => start(async () => setState(await act()));
  const open = (label: string) => (
    <button type="button" onClick={() => editItem(itemId)} className={plain}>
      <Pencil size={13} aria-hidden="true" /> {label}
    </button>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {fix.kind === "owner" && (
        <>
          {fix.suggest && (
            <button type="button" disabled={pending} onClick={() => run(() => setItemOwner(meetingId, itemId, fix.suggest!.value))} className={solid}>
              <Wand2 size={13} aria-hidden="true" /> اجعل {fix.suggest.label} مسؤولة
            </button>
          )}
          {open(fix.suggest ? "اختر غيره" : "اختر المسؤول")}
        </>
      )}
      {fix.kind === "due" && (
        <>
          {fix.suggest && (
            <button type="button" disabled={pending} onClick={() => run(() => setItemDueDates(meetingId, itemId, fix.suggest!.value))} className={solid}>
              <Wand2 size={13} aria-hidden="true" /> اضبط المواعيد على {fix.suggest.label}
            </button>
          )}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="موعد آخر للمتطلبات" className={inputWith("w-auto p-1 px-2 text-xs")} />
          <button type="button" disabled={pending || !date} onClick={() => run(() => setItemDueDates(meetingId, itemId, date))} className={plain}>
            تطبيق
          </button>
        </>
      )}
      {fix.kind === "send" && (
        <button type="button" disabled={pending} onClick={() => run(() => sendRequirements(meetingId))} title="يرسل كل طلبات متطلبات الاجتماع" className={solid}>
          <Send size={13} aria-hidden="true" /> أرسل الطلبات
        </button>
      )}
      {fix.kind === "edit" && open("عدّل البند")}
      {fix.kind === "below" && (
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <ArrowDown size={13} aria-hidden="true" /> تجده في مستندات البند ومتطلباته أدناه
        </span>
      )}
      {pending && <span className="text-ink-muted">جارٍ الحفظ…</span>}
      {!pending && state && <span className={state.ok ? "text-primary" : "text-danger"}>{state.message}</span>}
    </div>
  );
}
