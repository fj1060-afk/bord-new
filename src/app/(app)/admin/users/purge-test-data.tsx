"use client";

import { useActionState } from "react";
import { Eraser } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { purgeTestData } from "./actions";

/** One button that clears the end-to-end tests' leftovers (system administrator, trial data). */
export function PurgeTestData({ people, departments }: { people: number; departments: number }) {
  const [state, action] = useActionState(purgeTestData, null);
  if (!people && !departments && !state) return null;
  return (
    <section className="mt-8 rounded-lg border border-dashed border-danger/40 bg-surface p-5">
      <h2 className="font-medium">بيانات الاختبار</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {people} شخص و{departments} إدارة أنشأها الاختبار الآلي (أسماء مثل «عضو اختبار …» و«إدارة اختبار …»)، مع مقاعدهم ودعواتهم في اجتماعات التجربة. لا يمسّ المستخدمين الحقيقيين.
      </p>
      <ActionForm
        action={() => {
          if (window.confirm("حذف بيانات الاختبار نهائياً؟ لا يمكن التراجع.")) action();
        }}
        state={state}
        className="mt-3 flex flex-col gap-2"
      >
        <SubmitButton variant="danger" pendingLabel="جارٍ الحذف…" className="w-fit">
          <Eraser size={16} aria-hidden="true" /> حذف بيانات الاختبار
        </SubmitButton>
        <FormMessage state={state} />
      </ActionForm>
    </section>
  );
}
