"use client";

import { useActionState, useState, useTransition } from "react";
import { EnglishField, buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { ITEM_KINDS } from "@/lib/meetings";
import { requestDocument, reviewDocumentRequest, saveAgendaItem } from "../_actions/agenda";
import { byDepartment, ownerOf, type Target } from "./agenda-targets";

function TargetSelect({ name, targets, defaultValue, required, placeholder }: { name: string; targets: Target[]; defaultValue?: string; required?: boolean; placeholder: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={inputClass}>
      <option value="">{placeholder}</option>
      <optgroup label="الإدارات">
        {targets.filter((t) => t.group === "department").map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </optgroup>
      <UserGroups targets={targets} />
    </select>
  );
}

function UserGroups({ targets }: { targets: Target[] }) {
  return byDepartment(targets).map(([dept, users]) => (
    <optgroup key={dept || "-"} label={dept ? `أشخاص · ${dept}` : "أشخاص آخرون"}>
      {users.map((u) => (
        <option key={u.value + dept} value={u.value}>
          {u.label}
        </option>
      ))}
    </optgroup>
  ));
}

/** The presenter: a registered user (grouped by department) or someone outside the system. */
function PresenterField({ targets, userId, name }: { targets: Target[]; userId?: string | null; name?: string | null }) {
  const [choice, setChoice] = useState(userId ? `user:${userId}` : name ? "other" : "");
  const label = targets.find((t) => t.value === choice)?.label ?? "";
  return (
    <div className="flex flex-col gap-2">
      <select value={choice} onChange={(e) => setChoice(e.target.value)} className={inputClass} aria-label="مقدّم البند">
        <option value="">—</option>
        <UserGroups targets={targets} />
        <option value="other">شخص من خارج النظام…</option>
      </select>
      <input type="hidden" name="presenter_user_id" value={choice.startsWith("user:") ? choice.slice(5) : ""} />
      {choice === "other" ? <input name="presenter" defaultValue={name ?? ""} placeholder="اسم مقدّم البند" required className={inputClass} /> : <input type="hidden" name="presenter" value={label} />}
    </div>
  );
}

export type AgendaItem = {
  id: string;
  position: number;
  title: string;
  title_en?: string | null;
  description: string | null;
  kind: keyof typeof ITEM_KINDS;
  duration_minutes: number | null;
  presenter: string | null;
  presenter_user_id?: string | null;
  department_id: string | null;
  owner_user_id?: string | null;
};

export function AgendaItemForm({ meetingId, item, targets, onDone }: { meetingId: string; item?: AgendaItem; targets: Target[]; onDone?: () => void }) {
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
          <EnglishField name="title_en" defaultValue={item?.title_en} />
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
        <PresenterField targets={targets} userId={item?.presenter_user_id} name={item?.presenter} />
      </Field>
      <Field label="المسؤول عن البند" hint="إلزامي لبنود القرار؛ تُرسل إليه طلبات المستندات.">
        <TargetSelect name="owner" targets={targets} defaultValue={item ? ownerOf(item) : ""} placeholder="—" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="الوصف">
          <textarea spellCheck lang="ar" name="description" rows={3} defaultValue={item?.description ?? ""} className={inputClass} />
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

export function EditableAgendaItem({ meetingId, item, targets, children }: { meetingId: string; item: AgendaItem; targets: Target[]; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <AgendaItemForm meetingId={meetingId} item={item} targets={targets} onDone={() => setEditing(false)} />
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

export function DocumentRequestForm({ meetingId, itemId, targets, owner, dueDate }: { meetingId: string; itemId: string; targets: Target[]; owner: string; dueDate?: string }) {
  const [state, action] = useActionState(requestDocument.bind(null, meetingId, itemId), null);
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary">طلب مستند داعم من المسؤول</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input name="title" placeholder="المستند المطلوب" required className={inputClass} />
        <TargetSelect name="target" targets={targets} defaultValue={owner} required placeholder="المطلوب منه" />
        <input name="due_date" type="date" aria-label="آخر موعد" defaultValue={dueDate} className={inputClass} />
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
