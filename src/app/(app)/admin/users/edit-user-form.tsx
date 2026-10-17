"use client";

import { useActionState, useState } from "react";
import { Collapse } from "@/components/ui/collapse";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { EmailField, PhoneField } from "@/components/ui/contact-fields";
import { updateUserDetails } from "./actions";
import type { UserItem } from "./page";

/** Board or committee positions typed as a job title (they belong in «المنصب»). */
const looksLikePosition = (t: string) => /(رئيس|نائب رئيس|عضو)\s*(ال)?(مجلس|لجنة)|لجنة|أمين\s*السر|امين\s*السر|أمين\s*المجلس/.test(t);

/** The panel's «البيانات الأساسية»: name, email, mobile, job title and department of an existing user. */
export function EditUserForm({ user, departments, onCancel }: { user: UserItem; departments: { id: string; name: string }[]; onCancel: () => void }) {
  const [state, action] = useActionState(updateUserDetails.bind(null, user.id), null);
  const [title, setTitle] = useState(user.job_title ?? "");
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
          <input name="job_title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Collapse show={looksLikePosition(title)}>
          <p role="alert" className="rounded-md bg-brass-soft px-3 py-2 text-xs leading-5 text-brass">
            المسمى الوظيفي للوظيفة في الشركة فقط (مثل «المدير المالي»). المناصب في المجلس واللجان تُحدَّد من تبويب «المنصب».
          </p>
        </Collapse>
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
