"use client";

import { Plus } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { answerInfo, requestInfo } from "../_actions/info-requests";

export function RequestInfoForm({ meetingId, items }: { meetingId: string; items: { id: string; label: string }[] }) {
  const [state, action] = useActionState(requestInfo.bind(null, meetingId), null);
  return (
    <details className="open:basis-full">
      <summary className="motion-press inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-primary/50 px-4 text-sm font-medium text-primary hover:bg-primary-soft [&::-webkit-details-marker]:hidden">
        <Plus size={16} aria-hidden="true" /> إضافة طلب جديد
      </summary>
      <ActionForm action={action} state={state} className="mt-3 flex flex-col gap-3">
        <Field label="البند">
          <select name="agenda_item_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              اختر
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المطلوب">
          <textarea spellCheck lang="ar" name="question" rows={2} required className={inputClass} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="…" className="w-fit">
          إرسال
        </SubmitButton>
      </ActionForm>
    </details>
  );
}

export function AnswerInfoForm({ meetingId, requestId }: { meetingId: string; requestId: string }) {
  const [state, action] = useActionState(answerInfo.bind(null, meetingId, requestId), null);
  return (
    <ActionForm action={action} state={state} className="mt-2 flex flex-col gap-2">
      <textarea spellCheck lang="ar" name="response" rows={2} required placeholder="الرد، ويمكن رفع الوثيقة على البند" className={inputClass} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="…" variant="secondary" className="w-fit px-3 py-1 text-xs">
        إرسال الرد
      </SubmitButton>
    </ActionForm>
  );
}
