"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { AUTHORIZATIONS, grantExpiry, RESTRICTABLE, type Grant } from "@/lib/authority";
import { addAuthorization, removeAuthorization, saveRestrictions } from "./powers-actions";

type Row = Grant & { id: string; assembly_reference: string | null };

/** Bylaws restrictions on board powers and the assembly's authorizations, which decide how such items are worded. */
export function PowersForm({ restricted, grants, today, canEdit }: { restricted: string[]; grants: Row[]; today: string; canEdit: boolean }) {
  const [state, action] = useActionState(saveRestrictions, null);
  const [addState, add] = useActionState(addAuthorization, null);
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-rule bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-bold">صلاحيات المجلس وتفويضات الجمعية</h2>
        <p className="mt-1 text-sm text-ink-muted">تحدد هل يتخذ المجلس القرار بنفسه أم يرفعه توصيةً للجمعية العامة، ويستند إليها التدقيق النظامي لبنود الاجتماعات.</p>
      </div>

      <ActionForm action={action} state={state} className="flex flex-col gap-3">
        <strong className="text-sm">صلاحيات يقيّدها النظام الأساس للشركة (نظام الشركات م74)</strong>
        <p className="text-xs text-ink-muted">اختر ما يشترط النظام الأساس أو قرار الجمعية موافقة الجمعية عليه؛ وما لم تختره يبقى من صلاحيات المجلس.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(RESTRICTABLE).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="restricted" value={k} defaultChecked={restricted.includes(k)} disabled={!canEdit} /> {label}
            </label>
          ))}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2">
            <FormMessage state={state} />
            <SubmitButton className="w-fit">حفظ القيود</SubmitButton>
          </div>
        )}
      </ActionForm>

      <div className="flex flex-col gap-3">
        <strong className="text-sm">تفويضات الجمعية العامة للمجلس</strong>
        <p className="text-xs text-ink-muted">تفويض الأرباح المرحلية يُجدد سنوياً، وتفويض تعاملات الأطراف ذات العلاقة سنة على الأكثر؛ إن لم يُحدد تاريخ انتهاء يُحسب سنة من تاريخ القرار.</p>
        {grants.length === 0 && <p className="text-sm text-ink-muted">لا توجد تفويضات مسجلة.</p>}
        <ul className="flex flex-col gap-2">
          {grants.map((g) => {
            const end = grantExpiry(g);
            const active = g.granted_on <= today && end >= today;
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-paper p-3 text-sm">
                <span>
                  <strong>{AUTHORIZATIONS[g.kind]}</strong>
                  <span className="block text-xs text-ink-muted">
                    قرار الجمعية {g.granted_on}
                    {g.assembly_reference ? ` (${g.assembly_reference})` : ""} · حتى {end}
                  </span>
                </span>
                <span className={active ? "text-primary" : "text-danger"}>{active ? "ساري" : "منتهٍ"}</span>
                {canEdit && <ConfirmButton action={removeAuthorization.bind(null, g.id)} label="حذف" confirm="حذف هذا التفويض؟" />}
              </li>
            );
          })}
        </ul>
        {canEdit && (
          <ActionForm action={add} state={addState} className="grid gap-3 sm:grid-cols-2">
            <Field label="التفويض">
              <select name="kind" className={inputClass}>
                {Object.entries(AUTHORIZATIONS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الجمعية (اختياري)">
              <input name="assembly_reference" placeholder="مثل: الجمعية العامة العادية الخامسة" className={inputClass} />
            </Field>
            <Field label="تاريخ قرار الجمعية">
              <input name="granted_on" type="date" required className={inputClass} />
            </Field>
            <Field label="ينتهي في (اختياري)">
              <input name="expires_on" type="date" className={inputClass} />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FormMessage state={addState} />
              <SubmitButton className="w-fit">تسجيل التفويض</SubmitButton>
            </div>
          </ActionForm>
        )}
      </div>
    </section>
  );
}
