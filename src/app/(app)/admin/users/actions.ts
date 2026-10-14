"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/users";
const fail = (message: string): ActionState => ({ ok: false, message });

export async function inviteUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim();
  const roleIds = form.getAll("role").map(String);
  if (!email || !fullName) return fail("الاسم والبريد الإلكتروني مطلوبان.");
  if (roleIds.length === 0) return fail("اختر دوراً واحداً على الأقل.");

  const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${await siteUrl()}/set-password`,
  });
  if (error || !data.user) {
    return fail(error?.code === "email_exists" ? "يوجد مستخدم بهذا البريد." : "تعذّر إرسال الدعوة. تأكد من البريد وأعد المحاولة.");
  }

  // Profile and roles are written with the admin's own session, so RLS and the audit log apply.
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ phone: String(form.get("phone") ?? "").trim() || null, job_title: String(form.get("job_title") ?? "").trim() || null })
    .eq("id", data.user.id);
  const { error: rolesError } = await supabase
    .from("user_roles")
    .insert(roleIds.map((role_id) => ({ user_id: data.user.id, role_id })));
  if (rolesError) return fail("أُرسلت الدعوة، لكن تعذّر حفظ الأدوار. عدّلها من قائمة المستخدمين.");

  revalidatePath(PAGE);
  return { ok: true, message: `أُرسلت الدعوة إلى ${email}.` };
}

export async function updateUserRoles(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requirePage(PAGE, LEVELS.manage);
  if (userId === viewer.id) return fail("لا يمكنك تعديل أدوارك بنفسك.");
  const roleIds = form.getAll("role").map(String);
  if (roleIds.length === 0) return fail("اختر دوراً واحداً على الأقل.");

  const supabase = await createClient();
  const { data: current } = await supabase.from("user_roles").select("role_id").eq("user_id", userId);
  const existing = new Set((current ?? []).map((r) => r.role_id as string));
  const toRemove = [...existing].filter((id) => !roleIds.includes(id));
  const toAdd = roleIds.filter((id) => !existing.has(id));

  if (toRemove.length) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).in("role_id", toRemove);
    if (error) return fail("تعذّر حفظ الأدوار.");
  }
  if (toAdd.length) {
    const { error } = await supabase.from("user_roles").insert(toAdd.map((role_id) => ({ user_id: userId, role_id })));
    if (error) return fail("تعذّر حفظ الأدوار.");
  }
  revalidatePath(PAGE);
  return { ok: true, message: "حُفظت الأدوار." };
}

export async function setUserStatus(userId: string, status: "active" | "disabled") {
  const viewer = await requirePage(PAGE, LEVELS.edit);
  if (userId === viewer.id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw new Error("Could not update user status");

  // A ban stops the disabled user from signing in or refreshing an existing session.
  await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: status === "disabled" ? "876000h" : "none",
  });
  revalidatePath(PAGE);
}
