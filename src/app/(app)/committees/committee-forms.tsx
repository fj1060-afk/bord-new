"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { COMMITTEE_KINDS } from "@/lib/org";
import { saveCommittee } from "./actions";

export function CommitteeForm({ committee }: { committee?: { id: string; name: string; mandate: string | null; kind?: string } }) {
  const [state, action] = useActionState(saveCommittee.bind(null, committee?.id ?? null), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-4">
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
    </ActionForm>
  );
}

