"use client";

import { useActionState, useState } from "react";
import { EnglishField, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { ITEM_KINDS, MEETING_MODES, MEETING_TYPES, RSVP, riyadhParts } from "@/lib/meetings";
import { addGuest, createMeeting, respondRsvp, updateMeeting } from "../_actions/meeting";
import { reviewAgendaRequest, submitAgendaRequest } from "../_actions/requests";

type Option = { id: string; name: string };
type Body = Option & { kind: string };
type Meeting = {
  id: string;
  title: string;
  meeting_type: string;
  starts_at: string;
  duration_minutes: number;
  mode: string;
  location: string | null;
  location_en?: string | null;
  virtual_link: string | null;
};

function Select({ name, options, defaultValue, onChange }: { name: string; options: Record<string, string>; defaultValue?: string; onChange?: (v: string) => void }) {
  return (
    <select name={name} defaultValue={defaultValue} onChange={(e) => onChange?.(e.target.value)} className={inputClass}>
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** Create a meeting (with a body picker) or edit an existing meeting's details. */
export function MeetingDetailsForm({ meeting, bodies }: { meeting?: Meeting; bodies?: Body[] }) {
  const action = meeting ? updateMeeting.bind(null, meeting.id) : createMeeting;
  const [state, formAction] = useActionState(action, null);
  const [mode, setMode] = useState(meeting?.mode ?? "in_person");
  const when = meeting ? riyadhParts(meeting.starts_at) : { date: "", time: "10:00" };

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      {bodies && (
        <Field label="الجهة">
          <select name="body" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              اختر المجلس أو اللجنة
            </option>
            {bodies.map((b) => (
              <option key={b.id} value={`${b.kind}:${b.id}`}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="عنوان الاجتماع">
        <input name="title" defaultValue={meeting?.title} required className={inputClass} />
      </Field>
      <Field label="نوع الاجتماع">
        <Select name="meeting_type" options={MEETING_TYPES} defaultValue={meeting?.meeting_type ?? "regular"} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="التاريخ">
          <input name="date" type="date" defaultValue={when.date} required className={inputClass} />
        </Field>
        <Field label="الوقت (الرياض)">
          <input name="time" type="time" defaultValue={when.time} required className={inputClass} />
        </Field>
      </div>
      <Field label="المدة (بالدقائق)">
        <input name="duration_minutes" type="number" min={15} max={720} step={15} defaultValue={meeting?.duration_minutes ?? 120} className={inputClass} />
      </Field>
      <Field label="طريقة الانعقاد">
        <Select name="mode" options={MEETING_MODES} defaultValue={mode} onChange={setMode} />
      </Field>
      {mode !== "virtual" && (
        <Field label="المكان">
          <input name="location" defaultValue={meeting?.location ?? ""} required className={inputClass} />
          <EnglishField name="location_en" defaultValue={meeting?.location_en} />
        </Field>
      )}
      {mode !== "in_person" && (
        <Field label="رابط الاجتماع">
          <input name="virtual_link" type="url" dir="ltr" placeholder="https://" defaultValue={meeting?.virtual_link ?? ""} required className={inputClass} />
        </Field>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
          {meeting ? "حفظ التعديلات" : "إنشاء الاجتماع"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddGuestForm({ meetingId, people }: { meetingId: string; people: { id: string; full_name: string }[] }) {
  const [state, action] = useActionState(addGuest.bind(null, meetingId), null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <select name="person_id" required defaultValue="" className={`${inputClass} min-w-0 flex-1`}>
          <option value="" disabled>
            اختر ضيفاً من قائمة الأشخاص
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
        <SubmitButton variant="secondary" pendingLabel="…">
          دعوة
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function RsvpForm({ meetingId, current }: { meetingId: string; current: string }) {
  const [state, action] = useActionState(respondRsvp.bind(null, meetingId), null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-brass bg-surface p-5">
      <p className="font-medium">ردك على الدعوة: <span className="text-brass">{RSVP[current as keyof typeof RSVP]}</span></p>
      <div className="flex flex-wrap gap-4 text-sm">
        {(["accepted", "tentative", "declined"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="response" value={value} defaultChecked={current === value} required className="accent-primary" />
            {RSVP[value]}
          </label>
        ))}
      </div>
      <input name="note" placeholder="ملاحظة (اختياري)، مثل سبب الاعتذار" className={inputClass} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="…" className="w-fit">
        إرسال الرد
      </SubmitButton>
    </form>
  );
}

export function AgendaRequestForm({ departments, bodies }: { departments: Option[]; bodies: Body[] }) {
  const [state, action] = useActionState(submitAgendaRequest, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="الإدارة">
        <select name="department_id" required defaultValue={departments.length === 1 ? departments[0].id : ""} className={inputClass}>
          <option value="" disabled>
            اختر الإدارة
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="مرفوع إلى">
        <select name="body" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            المجلس أو اللجنة
          </option>
          {bodies.map((b) => (
            <option key={b.id} value={`${b.kind}:${b.id}`}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="عنوان البند المقترح">
        <input name="title" required className={inputClass} />
      </Field>
      <Field label="الغرض">
        <Select name="kind" options={ITEM_KINDS} defaultValue="decision" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="الوصف والمبررات">
          <textarea spellCheck lang="ar" name="description" rows={3} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الإرسال…" className="w-fit">
          إرسال الطلب
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReviewAgendaRequestForm({ requestId, meetings }: { requestId: string; meetings: Option[] }) {
  const [state, action] = useActionState(reviewAgendaRequest.bind(null, requestId), null);
  const [decision, setDecision] = useState("accepted");
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 border-t border-rule pt-3">
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          ["accepted", "قبول وإضافة لاجتماع"],
          ["rejected", "رفض"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} className="accent-primary" />
            {label}
          </label>
        ))}
      </div>
      {decision === "accepted" && (
        <select name="meeting_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {meetings.length ? "اختر الاجتماع" : "لا توجد اجتماعات قادمة لهذه الجهة"}
          </option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      <input name="review_note" placeholder={decision === "rejected" ? "سبب الرفض" : "ملاحظة (اختياري)"} required={decision === "rejected"} className={inputClass} />
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="…" className="w-fit">
        حفظ القرار
      </SubmitButton>
    </form>
  );
}
