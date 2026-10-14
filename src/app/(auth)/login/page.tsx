"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { signIn } from "../actions";

export default function LoginPage() {
  const [state, action] = useActionState(signIn, null);

  return (
    <AuthCard title="تسجيل الدخول" description="منصة حوكمة المجالس واللجان">
      <form action={action} className="flex flex-col gap-4">
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" autoComplete="email" dir="ltr" required className={inputClass} />
        </Field>
        <Field label="كلمة المرور">
          <input name="password" type="password" autoComplete="current-password" dir="ltr" required className={inputClass} />
        </Field>
        <Suspense>
          <LinkError />
        </Suspense>
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الدخول…">دخول</SubmitButton>
        <Link href="/forgot-password" className="text-center text-sm text-primary hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </form>
    </AuthCard>
  );
}

function LinkError() {
  if (useSearchParams().get("error") !== "link") return null;
  return <FormMessage state={{ ok: false, message: "الرابط منتهي أو مستخدم من قبل. اطلب رابطاً جديداً." }} />;
}
