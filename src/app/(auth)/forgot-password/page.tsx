"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, null);

  return (
    <AuthCard title="نسيت كلمة المرور" description="أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.">
      <ActionForm action={action} state={state} className="flex flex-col gap-4">
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" autoComplete="email" dir="ltr" required className={inputClass} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الإرسال…">إرسال الرابط</SubmitButton>
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </ActionForm>
    </AuthCard>
  );
}
