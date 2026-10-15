"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { createCircular, ratifyCircular } from "./actions";

export function CircularForm({ bodies }: { bodies: { value: string; label: string }[] }) {
  const [state, action] = useActionState(createCircular, null);
  return (
    <details className="mb-6 rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>قرار جديد بالتمرير</summary>
      <form action={action} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <Field label="الجهة">
          <select name="body" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              المجلس أو لجنة
            </option>
            {bodies.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="آخر موعد للتصويت">
          <input name="deadline" type="date" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="العنوان">
            <input name="title" spellCheck lang="ar" required className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="نص القرار">
            <textarea spellCheck lang="ar" name="text" rows={4} required className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            طرح للتصويت
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function RatifyForm({ circularId, meetings }: { circularId: string; meetings: { id: string; label: string }[] }) {
  const [state, action] = useActionState(ratifyCircular.bind(null, circularId), null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select name="meeting_id" required defaultValue="" className={inputClass + " w-auto"}>
        <option value="" disabled>
          الاجتماع الذي أُثبت فيه
        </option>
        {meetings.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <SubmitButton pendingLabel="…" variant="secondary" className="px-3 py-1 text-xs">
        إثبات
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
