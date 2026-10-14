"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { fileDisclosure, savePerson } from "./actions";

export type PersonDetails = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization: string | null;
  qualifications: string | null;
  experience: string | null;
  user_id: string | null;
};

export function PersonForm({
  person,
  users,
}: {
  person: PersonDetails;
  /** Accounts the viewer may link; empty when they cannot list users. */
  users: { id: string; full_name: string; email: string }[];
}) {
  const [state, action] = useActionState(savePerson.bind(null, person.id), null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="الاسم الكامل">
        <input name="full_name" defaultValue={person.full_name} required className={inputClass} />
      </Field>
      <Field label="المسمى الوظيفي">
        <input name="job_title" defaultValue={person.job_title ?? ""} className={inputClass} />
      </Field>
      <Field label="البريد الإلكتروني">
        <input name="email" type="email" dir="ltr" defaultValue={person.email ?? ""} className={inputClass} />
      </Field>
      <Field label="الجوال">
        <input name="phone" type="tel" dir="ltr" defaultValue={person.phone ?? ""} className={inputClass} />
      </Field>
      <Field label="جهة العمل">
        <input name="organization" defaultValue={person.organization ?? ""} className={inputClass} />
      </Field>
      {users.length > 0 && (
        <Field label="حساب الدخول" hint="يربط العضو بحسابه ليقدّم إفصاحه بنفسه.">
          <select name="user_id" defaultValue={person.user_id ?? ""} className={inputClass}>
            <option value="">بدون حساب</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="المؤهلات">
        <textarea name="qualifications" rows={3} defaultValue={person.qualifications ?? ""} className={inputClass} />
      </Field>
      <Field label="الخبرات">
        <textarea name="experience" rows={3} defaultValue={person.experience ?? ""} className={inputClass} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
          حفظ البيانات
        </SubmitButton>
      </div>
    </form>
  );
}

export function DisclosureForm({ personId, year }: { personId: string; year: number }) {
  const [state, action] = useActionState(fileDisclosure.bind(null, personId), null);
  const [conflict, setConflict] = useState("no");
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-brass bg-surface p-5">
      <p className="font-medium">
        إفصاح عام <span className="font-mono">{year}</span>
      </p>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2">هل لدى العضو أي مصلحة مباشرة أو غير مباشرة قد تتعارض مع مصلحة المنشأة؟</legend>
        {[
          ["no", "لا يوجد تعارض مصالح"],
          ["yes", "يوجد تعارض مصالح"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="has_conflict"
              value={value}
              checked={conflict === value}
              onChange={() => setConflict(value)}
              className="accent-primary"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {conflict === "yes" && (
        <Field label="التفاصيل" hint="الجهة، وطبيعة المصلحة، ونسبة الملكية أو المنصب إن وجد.">
          <textarea name="details" rows={4} required className={inputClass} />
        </Field>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ التقديم…" className="w-fit">
        تقديم الإفصاح
      </SubmitButton>
    </form>
  );
}
