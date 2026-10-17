"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { EmailField, PhoneField } from "@/components/ui/contact-fields";
import { saveContact, saveCorrespondence } from "./actions";

export type Letter = { id: string; subject: string; body: string | null; reference: string | null; contact_id: string | null; dated_on: string | null; due_date: string | null };
type Contact = { id: string; name: string; organization: string | null };

export function CorrespondenceForm({ direction, contacts, letter, label }: { direction: "incoming" | "outgoing"; contacts: Contact[]; letter?: Letter; label: string }) {
  const [state, action] = useActionState(saveCorrespondence.bind(null, letter?.id ?? null, direction), null);
  const incoming = direction === "incoming";
  return (
    <details className={letter ? "" : "mb-4 rounded-lg border border-rule bg-surface"}>
      <summary className={buttonClass(letter ? "secondary" : "primary", letter ? "cursor-pointer list-none px-3 py-1 text-xs" : "m-4 w-fit cursor-pointer list-none")}>{label}</summary>
      <ActionForm action={action} state={state} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="الموضوع">
            <input name="subject" spellCheck lang="ar" required defaultValue={letter?.subject} className={inputClass} />
          </Field>
        </div>
        <Field label={incoming ? "الجهة المرسلة" : "الجهة المرسل إليها"}>
          <select name="contact_id" defaultValue={letter?.contact_id ?? ""} className={inputClass}>
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.organization ? ` (${c.organization})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="رقم القيد">
          <input name="reference" defaultValue={letter?.reference ?? ""} className={inputClass} />
        </Field>
        {incoming && (
          <Field label="تاريخ الورود">
            <input name="dated_on" type="date" defaultValue={letter?.dated_on ?? ""} className={inputClass} />
          </Field>
        )}
        <Field label="تاريخ المتابعة" hint="يظهر في المتابعات حتى يُغلق.">
          <input name="due_date" type="date" defaultValue={letter?.due_date ?? ""} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={incoming ? "الملخص" : "النص"}>
            <textarea spellCheck lang="ar" name="body" rows={incoming ? 3 : 8} defaultValue={letter?.body ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            حفظ
          </SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}

export function ContactForm() {
  const [state, action] = useActionState(saveContact, null);
  return (
    <details className="mb-4 rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة جهة اتصال</summary>
      <ActionForm action={action} state={state} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        {[
          ["name", "الاسم", "text"],
          ["organization", "الجهة", "text"],
          ["title", "المسمى", "text"],
          ["email", "البريد الإلكتروني", "email"],
          ["phone", "الجوال", "tel"],
        ].map(([name, label, type]) => (
          <Field key={name} label={label}>
            {type === "email" ? <EmailField name={name} /> : type === "tel" ? <PhoneField name={name} /> : <input name={name} required={name === "name"} className={inputClass} />}
          </Field>
        ))}
        <Field label="ملاحظات">
          <input name="notes" className={inputClass} />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            حفظ
          </SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}
