"use client";

import { useState, useTransition } from "react";
import { Pencil, Send, Wand2 } from "lucide-react";
import type { ActionState } from "@/components/ui/form";
import { inputWith } from "@/components/ui/styles";
import { setItemDueDates, setItemOwner } from "../_actions/quick-fixes";
import { sendRequirements } from "../_actions/requirements";
import { FixLink } from "./fix-link";

export type QuickFixKind = { kind: "owner" | "due" | "send" | "edit"; suggest?: { value: string; label: string } };

const solid = "motion-press inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90 disabled:opacity-50";
const plain = "motion-press inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-1 text-xs hover:border-primary disabled:opacity-50";

/** The one-click fix an item chip offers: the suggested owner or deadline, sending, or opening the item. */
export function QuickFix({ meetingId, href, anchor, fix }: { meetingId: string; href: string; anchor: string; fix: QuickFixKind }) {
  const itemId = anchor.replace(/^item-/, "");
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);
  const [date, setDate] = useState(fix.suggest?.value ?? "");
  const run = (act: () => Promise<ActionState>) => start(async () => setState(await act()));
  const open = (label: string) => (
    <FixLink href={href} anchor={anchor} className={plain}>
      <Pencil size={13} aria-hidden="true" /> {label}
    </FixLink>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {fix.kind === "owner" && (
        <>
          {fix.suggest && (
            <button type="button" disabled={pending} onClick={() => run(() => setItemOwner(meetingId, itemId, fix.suggest!.value))} className={solid}>
              <Wand2 size={13} aria-hidden="true" /> اجعل {fix.suggest.label} مسؤولة عن البند
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
        <button type="button" disabled={pending} onClick={() => run(() => sendRequirements(meetingId))} className={solid}>
          <Send size={13} aria-hidden="true" /> أرسل طلبات الاجتماع الآن
        </button>
      )}
      {fix.kind === "edit" && open("افتح البند للتعديل")}
      {pending && <span className="text-ink-muted">جارٍ الحفظ…</span>}
      {!pending && state && <span className={state.ok ? "text-primary" : "text-danger"}>{state.message}</span>}
    </div>
  );
}
