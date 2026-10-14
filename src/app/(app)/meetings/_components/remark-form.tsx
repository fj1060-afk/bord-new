"use client";

import { useActionState } from "react";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { REMARK_KINDS } from "@/lib/secretary";
import { addRemark } from "../_actions/remarks";

type Option = { id: string; label?: string; name?: string };

export function RemarkForm({ meetingId, minutesId, mode, people, resolutions }: { meetingId: string; minutesId: string; mode: "comment" | "record"; people: Option[]; resolutions: Option[] }) {
  const [state, action] = useActionState(addRemark.bind(null, meetingId, minutesId), null);
  return (
    <details>
      <summary className={buttonClass("secondary", "w-fit cursor-pointer list-none px-3 py-1 text-xs")}>{mode === "comment" ? "إضافة ملاحظة على المسودة" : "تسجيل تحفظ أو رأي مخالف"}</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        {mode === "comment" ? (
          <input type="hidden" name="kind" value="comment" />
        ) : (
          <>
            <Field label="النوع">
              <select name="kind" defaultValue="dissent" className={inputClass}>
                {Object.entries(REMARK_KINDS)
                  .filter(([k]) => k !== "comment")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="العضو">
              <select name="person_id" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  اختر
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="القرار (اختياري)">
              <select name="resolution_id" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {resolutions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <div className="sm:col-span-3">
          <Field label="النص">
            <textarea spellCheck lang="ar" name="note" rows={2} required className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-3">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            حفظ
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}
