"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { POSITION_ROLES, type PositionRole } from "@/lib/affiliations";
import { addPosition, removePosition } from "./actions";

export type Position = { id: string; organization: string; role: PositionRole; title: string | null; listed: boolean; start_year: number | null; end_year: number | null };

const years = (p: Position) => (p.start_year ? `${p.start_year} – ${p.end_year ?? "الآن"}` : p.end_year ? `حتى ${p.end_year}` : "حالي");

/** The member's CV as positions: companies they own, partner in, chair, sit on or work for. Agenda items naming a current one raise a notice. */
export function CvEditor({ personId, positions, canEdit }: { personId: string; positions: Position[]; canEdit: boolean }) {
  const [state, action] = useActionState(addPosition.bind(null, personId), null);
  const [current, setCurrent] = useState(true);
  const sorted = [...positions].sort((a, b) => Number(a.end_year !== null) - Number(b.end_year !== null) || (b.start_year ?? 0) - (a.start_year ?? 0));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-muted">اكتب اسم كل جهة كما يرد في المعاملات. إذا ذكر بند أو قرار جهةً للعضو فيها منصب حالي، ينبّه النظام إلى مصلحة محتملة.</p>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">لم تُضف مناصب بعد.</p>
      ) : (
        <ul className="divide-y divide-rule rounded-lg border border-rule">
          {sorted.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <strong>{p.organization}</strong>
                <span className="block text-xs text-ink-muted">
                  {p.role === "other" && p.title ? p.title : POSITION_ROLES[p.role]}
                  {p.role !== "other" && p.title ? ` · ${p.title}` : ""}
                  {p.listed ? " · شركة مدرجة" : ""}
                </span>
              </span>
              <span className={p.end_year === null ? "text-xs text-primary" : "text-xs text-ink-muted"}>{years(p)}</span>
              {canEdit && <ConfirmButton action={removePosition.bind(null, personId, p.id)} label="حذف" confirm={`حذف «${p.organization}» من السيرة؟`} />}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <details className="rounded-lg border border-dashed border-rule p-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">إضافة منصب أو جهة</summary>
          <ActionForm action={action} state={state} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="الجهة">
              <input name="organization" required placeholder="شركة …" spellCheck lang="ar" className={inputClass} />
            </Field>
            <Field label="الصفة">
              <select name="role" defaultValue="board_member" className={inputClass}>
                {Object.entries(POSITION_ROLES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="المسمى (اختياري)" hint="مثل: نائب الرئيس للمالية، أو نسبة الملكية للمالك والشريك.">
              <input name="title" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="من سنة">
                <input name="start_year" type="number" min={1950} max={2100} className={inputClass} />
              </Field>
              <Field label="إلى سنة">
                <input name="end_year" type="number" min={1950} max={2100} disabled={current} className={inputClass} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="current" checked={current} onChange={(e) => setCurrent(e.target.checked)} /> منصب حالي
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="listed" /> شركة مدرجة (يُحتسب في حد العضويات الخمس)
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FormMessage state={state} />
              <SubmitButton className="w-fit">إضافة</SubmitButton>
            </div>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
