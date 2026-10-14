"use client";

import { useActionState } from "react";
import { PersonPicker } from "@/components/org/person-picker";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { COMMITTEE_KINDS, COMMITTEE_POSITIONS } from "@/lib/org";
import { addCommitteeMember, saveCommittee } from "./actions";

export function CommitteeForm({ committee }: { committee?: { id: string; name: string; mandate: string | null; kind?: string } }) {
  const [state, action] = useActionState(saveCommittee.bind(null, committee?.id ?? null), null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="اسم اللجنة">
        <input name="name" defaultValue={committee?.name} required className={inputClass} />
      </Field>
      <Field label="نوع اللجنة" hint="تعتمد عليه قواعد الامتثال، مثل تشكيل لجنة المراجعة.">
        <select name="kind" defaultValue={committee?.kind ?? "other"} className={inputClass}>
          {Object.entries(COMMITTEE_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="مهام اللجنة واختصاصاتها">
        <textarea spellCheck lang="ar" name="mandate" rows={4} defaultValue={committee?.mandate ?? ""} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
        {committee ? "حفظ التعديلات" : "إنشاء اللجنة"}
      </SubmitButton>
    </form>
  );
}

export function AddCommitteeMemberForm({
  committeeId,
  people,
}: {
  committeeId: string;
  people: { id: string; full_name: string }[];
}) {
  const [state, action] = useActionState(addCommitteeMember.bind(null, committeeId), null);
  return (
    <details className="rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة عضو</summary>
      <form action={action} className="flex flex-col gap-4 border-t border-rule p-5">
        <PersonPicker people={people} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المنصب">
            <select name="position" defaultValue="member" className={inputClass}>
              {Object.entries(COMMITTEE_POSITIONS).map(([value, label]) => (
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
