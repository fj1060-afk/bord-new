"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { RESOLUTION_STATUS } from "@/lib/minutes";
import { createMinutes, saveMinutes, saveResolution, signMinutes } from "../_actions/minutes";

export function CreateMinutesButton({ meetingId }: { meetingId: string }) {
  const [state, action] = useActionState(() => createMinutes(meetingId), null);
  return (
    <form action={action} className="flex flex-col items-center gap-3">
      <SubmitButton pendingLabel="جارٍ الإعداد…">إعداد المحضر</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

type Item = { id: string; position: number; title: string; deliberation: string | null };

export function MinutesEditor({ meetingId, minutesId, intro, closing, items }: { meetingId: string; minutesId: string; intro: string | null; closing: string | null; items: Item[] }) {
  const [state, action] = useActionState(saveMinutes.bind(null, meetingId, minutesId), null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="الافتتاحية">
        <textarea name="intro" rows={4} defaultValue={intro ?? ""} className={inputClass} />
      </Field>
      {items.map((item) => (
        <Field key={item.id} label={`${item.position}. ${item.title}`} hint="ما دار من نقاش وما انتهى إليه البند.">
          <textarea name={`item:${item.id}`} rows={4} defaultValue={item.deliberation ?? ""} className={inputClass} />
        </Field>
      ))}
      <Field label="الختام">
        <textarea name="closing" rows={2} defaultValue={closing ?? ""} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
        حفظ المحضر
      </SubmitButton>
    </form>
  );
}

type Resolution = { id: string; text: string; status: string; votes_for: number | null; votes_against: number | null; votes_abstain: number | null };

export function ResolutionForm({ meetingId, agendaItemId, resolution }: { meetingId: string; agendaItemId: string | null; resolution?: Resolution }) {
  const [state, action] = useActionState(saveResolution.bind(null, meetingId, agendaItemId, resolution?.id ?? null), null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md bg-paper p-4">
      <Field label="نص القرار">
        <textarea name="text" rows={3} defaultValue={resolution?.text ?? ""} required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="الحالة">
          <select name="status" defaultValue={resolution?.status ?? "approved"} className={inputClass}>
            {Object.entries(RESOLUTION_STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="موافق">
          <input name="votes_for" type="number" min={0} defaultValue={resolution?.votes_for ?? ""} className={inputClass} />
        </Field>
        <Field label="معارض">
          <input name="votes_against" type="number" min={0} defaultValue={resolution?.votes_against ?? ""} className={inputClass} />
        </Field>
        <Field label="ممتنع">
          <input name="votes_abstain" type="number" min={0} defaultValue={resolution?.votes_abstain ?? ""} className={inputClass} />
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="…" className="w-fit">
        {resolution ? "حفظ القرار" : "تسجيل القرار"}
      </SubmitButton>
    </form>
  );
}

export function SignMinutesButton({ meetingId, minutesId }: { meetingId: string; minutesId: string }) {
  const [state, action] = useActionState(() => signMinutes(meetingId, minutesId), null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <p className="text-sm">بالتوقيع تؤكد أن المحضر يعكس ما دار في الاجتماع.</p>
      <SubmitButton pendingLabel="جارٍ التوقيع…" className="w-fit">
        توقيع المحضر
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
