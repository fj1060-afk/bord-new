"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { EmailField, PhoneField } from "@/components/ui/contact-fields";
import { updateUserDetails } from "./actions";
import type { UserItem } from "./page";

/** The panel's «البيانات الأساسية»: name, email, mobile, job title and department of an existing user. */
export function EditUserForm({ user, departments, onCancel }: { user: UserItem; departments: { id: string; name: string }[]; onCancel: () => void }) {
  const [state, action] = useActionState(updateUserDetails.bind(null, user.id), null);
  return (
      <ActionForm action={action} state={state} className="flex flex-col gap-4">
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
        <FormMessage state={state} />
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ التغييرات</SubmitButton>
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
            إلغاء
          </button>
        </div>
      </ActionForm>
  );
}
