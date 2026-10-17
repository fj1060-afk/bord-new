"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { EmailField, PhoneField } from "@/components/ui/contact-fields";
import { updateUserDetails } from "./actions";
import type { UserItem } from "./page";

/** «تعديل البيانات»: name, email, mobile, job title and department of an existing user. */
export function EditUserForm({ user, departments }: { user: UserItem; departments: { id: string; name: string }[] }) {
  const [state, action] = useActionState(updateUserDetails.bind(null, user.id), null);
  return (
    <details className="group/edit rounded-md border border-rule bg-surface">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">تعديل البيانات</summary>
      <ActionForm action={action} state={state} className="grid gap-4 border-t border-rule p-4 sm:grid-cols-2">
        <Field label="الاسم الكامل">
          <input name="full_name" required defaultValue={user.full_name} className={inputClass} />
        </Field>
        <Field label="البريد الإلكتروني">
          <EmailField name="email" required defaultValue={user.email} />
        </Field>
        <Field label="الجوال">
          <PhoneField name="phone" defaultValue={user.phone ?? ""} />
        </Field>
        <Field label="المسمى الوظيفي">
          <input name="job_title" defaultValue={user.job_title ?? ""} className={inputClass} />
        </Field>
        <Field label="الإدارة">
          <select name="department_id" defaultValue={user.departmentId ?? ""} className={inputClass}>
            <option value="">بلا إدارة</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
            حفظ البيانات
          </SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}
