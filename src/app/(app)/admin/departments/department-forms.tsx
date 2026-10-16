"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { addDelegate, createDepartment } from "./actions";

export function CreateDepartmentForm() {
  const [state, action] = useActionState(createDepartment, null);
  return (
    <ActionForm action={action} state={state} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <Field label="اسم الإدارة">
        <input name="name" required className={inputClass} />
      </Field>
      <Field label="الرمز">
        <input name="code" dir="ltr" placeholder="FIN" className={inputClass} />
      </Field>
      <SubmitButton pendingLabel="جارٍ الإنشاء…">إضافة الإدارة</SubmitButton>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}

export function AddDelegateForm({
  departmentId,
  users,
}: {
  departmentId: string;
  users: { id: string; full_name: string; email: string }[];
}) {
  const [state, action] = useActionState(addDelegate.bind(null, departmentId), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <select name="user_id" required defaultValue="" className={`${inputClass} min-w-0 flex-1`}>
          <option value="" disabled>
            اختر مستخدماً
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}
            </option>
          ))}
        </select>
        <SubmitButton variant="secondary" pendingLabel="…">
          إضافة مخوّل
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}
