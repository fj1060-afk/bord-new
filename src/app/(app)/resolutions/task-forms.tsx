"use client";

import { useActionState, useRef, useState } from "react";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton, type ActionState } from "@/components/ui/form";
import { MAX_UPLOAD_BYTES, storagePath } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/client";
import { addTask, reportProgress } from "./actions";

export function AddTaskForm({
  resolutionId,
  users,
  departments,
}: {
  resolutionId: string;
  users: { id: string; full_name: string; email: string }[];
  departments: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(addTask.bind(null, resolutionId), null);
  return (
    <details className="rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة مهمة</summary>
      <form action={action} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="المهمة">
            <input name="title" required className={inputClass} />
          </Field>
        </div>
        <Field label="المسؤول">
          <select name="assignee" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              إدارة أو شخص
            </option>
            <optgroup label="الإدارات">
              {departments.map((d) => (
                <option key={d.id} value={`department:${d.id}`}>
                  {d.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="الأشخاص">
              {users.map((u) => (
                <option key={u.id} value={`user:${u.id}`}>
                  {u.full_name || u.email}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="تاريخ الاستحقاق">
          <input name="due_date" type="date" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="التفاصيل">
            <textarea name="description" rows={2} className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            إضافة المهمة
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}

/** Progress report with an optional evidence file uploaded straight to private storage. */
export function ProgressForm({ taskId, current }: { taskId: string; current: string }) {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(form: FormData) {
    setBusy(true);
    const file = form.get("file") as File | null;
    let path: string | null = null;
    if (file && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setBusy(false);
        return setState({ ok: false, message: "الحد الأقصى لحجم الملف 25 ميجابايت." });
      }
      path = storagePath(taskId, file.name, crypto.randomUUID());
      const { error } = await createClient().storage.from("task-evidence").upload(path, file, { contentType: file.type });
      if (error) {
        setBusy(false);
        return setState({ ok: false, message: "تعذّر رفع الملف." });
      }
    }
    const result = await reportProgress({
      taskId,
      status: String(form.get("status")),
      note: String(form.get("note") ?? ""),
      path,
      fileName: path ? file!.name : null,
    });
    setState(result);
    setBusy(false);
    if (result.ok) formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={submit} className="mt-3 flex flex-col gap-3 border-t border-rule pt-3">
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          ["in_progress", "قيد التنفيذ"],
          ["done", "منجزة"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="status" value={value} defaultChecked={(current === "done" ? "done" : "in_progress") === value} className="accent-primary" />
            {label}
          </label>
        ))}
      </div>
      <textarea name="note" rows={2} placeholder="ما الذي تم؟" className={inputClass} />
      <input type="file" name="file" aria-label="دليل الإنجاز" className="text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
      <FormMessage state={state} />
      <button disabled={busy} className={buttonClass("secondary", "w-fit")}>
        {busy ? "جارٍ الحفظ…" : "حفظ التحديث"}
      </button>
    </form>
  );
}
