"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { overrideCheck } from "../_actions/journey";

/** Passes a warning with a written reason (kept in the audit log). */
export function OverrideForm({ meetingId, rule }: { meetingId: string; rule: string }) {
  const [state, action] = useActionState(overrideCheck.bind(null, meetingId, rule), null);
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-brass">تجاوز بسبب</summary>
      <ActionForm action={action} state={state} className="mt-2 flex flex-wrap gap-2">
        <input name="reason" required placeholder="سبب التجاوز (يُسجّل في سجل التدقيق)" className={inputClass + " min-w-0 flex-1"} />
        <SubmitButton pendingLabel="…" variant="secondary" className="px-3 py-1 text-xs">
          تسجيل
        </SubmitButton>
        <FormMessage state={state} />
      </ActionForm>
    </details>
  );
}
