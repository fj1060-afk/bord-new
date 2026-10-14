"use client";

import { useActionState, useState } from "react";
import { PersonPicker } from "@/components/org/person-picker";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { formatGregorianDate } from "@/lib/format";
import { BOARD_CATEGORIES, BOARD_POSITIONS, TERM_YEARS, termEnd, termYears } from "@/lib/org";
import { addBoardMember, saveBoard } from "./actions";

type Board = { id: string; name: string; term_start: string; term_end: string };

export function BoardForm({ board }: { board?: Board }) {
  const [state, action] = useActionState(saveBoard.bind(null, board?.id ?? null), null);
  const [start, setStart] = useState(board?.term_start ?? "");
  const [years, setYears] = useState(board ? termYears(board.term_start, board.term_end) : 3);
  const end = termEnd(start, years);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <Field label="اسم المجلس">
        <input name="name" defaultValue={board?.name} required className={inputClass} />
      </Field>
      <Field label="تاريخ بداية الدورة">
        <input
          name="term_start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="مدة الدورة">
        <select name="term_years" value={years} onChange={(e) => setYears(Number(e.target.value))} className={inputClass}>
          {TERM_YEARS.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? "سنة واحدة" : n === 2 ? "سنتان" : `${n} سنوات`}
            </option>
          ))}
        </select>
      </Field>
      <p className="rounded-md bg-primary-soft px-4 py-3 text-sm text-primary sm:col-span-3" aria-live="polite">
        {end ? (
          <>
            تنتهي الدورة في <strong>{formatGregorianDate(new Date(`${end}T12:00:00Z`))}</strong>
          </>
        ) : (
          "أدخل تاريخ البداية ليظهر تاريخ نهاية الدورة."
        )}
      </p>
      <div className="flex flex-col gap-3 sm:col-span-3">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
          {board ? "حفظ التعديلات" : "إنشاء المجلس"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddBoardMemberForm({ boardId, people }: { boardId: string; people: { id: string; full_name: string }[] }) {
  const [state, action] = useActionState(addBoardMember.bind(null, boardId), null);
  return (
    <details className="rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة عضو</summary>
      <form action={action} className="flex flex-col gap-4 border-t border-rule p-5">
        <PersonPicker people={people} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="المنصب">
            <select name="position" defaultValue="member" className={inputClass}>
              {Object.entries(BOARD_POSITIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الصفة">
            <select name="category" defaultValue="non_executive" className={inputClass}>
              {Object.entries(BOARD_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ بداية العضوية">
            <input name="start_date" type="date" className={inputClass} />
          </Field>
        </div>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الإضافة…" className="w-fit">
          إضافة العضو
        </SubmitButton>
      </form>
    </details>
  );
}
