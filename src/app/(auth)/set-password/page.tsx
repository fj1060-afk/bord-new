"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { setPassword } from "../actions";

export default function SetPasswordPage() {
  const [state, action] = useActionState(setPassword, null);

  return (
    <AuthCard title="تعيين كلمة المرور" description="اختر كلمة مرور من 10 أحرف على الأقل.">
      <ActionForm action={action} state={state} className="flex flex-col gap-4">
        <Field label="كلمة المرور الجديدة">
          <input name="password" type="password" autoComplete="new-password" dir="ltr" minLength={10} required className={inputClass} />
        </Field>
        <Field label="تأكيد كلمة المرور">
          <input name="confirm" type="password" autoComplete="new-password" dir="ltr" minLength={10} required className={inputClass} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ والدخول</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
