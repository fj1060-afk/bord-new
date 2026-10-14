"use client";

import { useActionState, useState, useTransition } from "react";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { ITEM_KINDS } from "@/lib/meetings";
import { requestDocument, reviewDocumentRequest, saveAgendaItem } from "../_actions/agenda";

type Option = { id: string; name: string };
export type AgendaItem = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  kind: keyof typeof ITEM_KINDS;
  duration_minutes: number | null;
  presenter: string | null;
  department_id: string | null;
};

export function AgendaItemForm({ meetingId, item, departments, onDone }: { meetingId: string; item?: AgendaItem; departments: Option[]; onDone?: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveAgendaItem>[2], form: FormData) => {
    const result = await saveAgendaItem(meetingId, item?.id ?? null, prev, form);
    if (result?.ok) onDone?.();
    return result;
  }, null);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="عنوان البند">
          <input name="title" defaultValue={item?.title} required className={inputClass} />
        </Field>
      </div>
      <Field label="الغرض">
        <select name="kind" defaultValue={item?.kind ?? "discussion"} className={inputClass}>
          {Object.entries(ITEM_KINDS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="المدة (دقائق)">
        <input name="duration_minutes" type="number" min={1} max={480} defaultValue={item?.duration_minutes ?? ""} className={inputClass} />
      </Field>
      <Field label="مقدّم البند">
        <input name="presenter" defaultValue={item?.presenter ?? ""} className={inputClass} />
      </Field>
      <Field label="الإدارة المعنية">
        <select name="department_id" defaultValue={item?.department_id ?? ""} className={inputClass}>
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="الوصف">
          <textarea name="description" rows={3} defaultValue={item?.description ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
          {item ? "حفظ البند" : "إضافة البند"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function EditableAgendaItem({ meetingId, item, departments, children }: { meetingId: string; item: AgendaItem; departments: Option[]; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <AgendaItemForm meetingId={meetingId} item={item} departments={departments} onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="w-fit text-sm text-ink-muted hover:underline">
          إلغاء
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {children}
      <button type="button" onClick={() => setEditing(true)} className="w-fit text-sm text-primary hover:underline">
        تعديل البند
      </button>
    </div>
  );
}

export function DocumentRequestForm({ meetingId, itemId, departments }: { meetingId: string; itemId: string; departments: Option[] }) {
  const [state, action] = useActionState(requestDocument.bind(null, meetingId, itemId), null);
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary">طلب مستند من إدارة</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input name="title" placeholder="المستند المطلوب" required className={inputClass} />
        <select name="department_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            الإدارة
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input name="due_date" type="date" aria-label="آخر موعد" className={inputClass} />
        <div className="flex flex-col gap-2 sm:col-span-3">
          <FormMessage state={state} />
          <SubmitButton variant="secondary" pendingLabel="…" className="w-fit">
            إرسال الطلب
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}

export function ReviewDocumentButtons({ meetingId, requestId }: { meetingId: string; requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => reviewDocumentRequest(meetingId, requestId, "accepted"))} className={buttonClass("secondary", "px-3 py-1 text-xs")}>
        اعتماد
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const note = window.prompt("ما المطلوب تعديله؟");
          if (note) start(() => reviewDocumentRequest(meetingId, requestId, "returned", note));
        }}
        className={buttonClass("danger", "px-3 py-1 text-xs")}
      >
        إعادة للتعديل
      </button>
    </span>
  );
}
