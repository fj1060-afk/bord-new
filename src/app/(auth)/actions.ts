"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "أدخل البريد الإلكتروني وكلمة المرور." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      message:
        error.status === 429
          ? "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة."
          : error.status === 400
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
            : "تعذّر الاتصال بخدمة الدخول. أعد المحاولة بعد قليل.",
    };
  }
  redirect("/");
}

export async function requestPasswordReset(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "أدخل البريد الإلكتروني." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/set-password`,
  });
  // Same answer whether or not the account exists, so emails cannot be probed.
  return { ok: true, message: "إذا كان البريد مسجلاً فستصلك رسالة فيها رابط تعيين كلمة المرور." };
}

export async function setPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) return { ok: false, message: "كلمة المرور يجب أن تكون 10 أحرف على الأقل." };
  if (password !== confirm) return { ok: false, message: "كلمتا المرور غير متطابقتين." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: "تعذّر حفظ كلمة المرور. اطلب رابطاً جديداً وأعد المحاولة." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
