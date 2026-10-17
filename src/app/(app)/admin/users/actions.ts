"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { siteUrl } from "@/lib/site-url";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/users";
const fail = (message: string): ActionState => ({ ok: false, message });
const NOT_CONFIGURED = "مفتاح Supabase السري غير مضبوط على الخادم (SUPABASE_SECRET_KEY). راجع docs/SETUP.md.";

/** Emails a link to set a password; works for new and existing accounts. */
async function emailInvitation(userId: string, email: string): Promise<boolean> {
  // The admin client has no session, so the link is not tied to the sender's browser.
  const { error } = await createAdminClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/set-password`,
  });
  if (error) return false;
  const supabase = await createClient();
  await supabase.from("profiles").update({ invited_at: new Date().toISOString() }).eq("id", userId);
  return true;
}

/** Creates the account; sends the invitation now only when the form asks for it. */
export async function createUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim();
  const roleIds = form.getAll("role").map(String);
  const sendNow = form.get("intent") === "invite";
  if (!email || !fullName) return fail("الاسم والبريد الإلكتروني مطلوبان.");
  if (roleIds.length === 0) return fail("اختر دوراً واحداً على الأقل.");
  if (!adminConfigured()) return fail(NOT_CONFIGURED);

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    return fail(error?.code === "email_exists" ? "يوجد مستخدم بهذا البريد." : "تعذّر إنشاء المستخدم. تأكد من البريد وأعد المحاولة.");
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
  if (rolesError) return fail("أُنشئ المستخدم، لكن تعذّر حفظ الأدوار. عدّلها من القائمة.");

  revalidatePath(PAGE);
  if (!sendNow) return { ok: true, message: `أُنشئ المستخدم. أرسل له الدعوة من القائمة متى شئت.` };
  return (await emailInvitation(data.user.id, email))
    ? { ok: true, message: `أُنشئ المستخدم وأُرسلت الدعوة إلى ${email}.` }
    : fail("أُنشئ المستخدم، لكن تعذّر إرسال الدعوة. أعد الإرسال من القائمة.");
}

export async function sendInvitation(userId: string): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  if (!adminConfigured()) return fail(NOT_CONFIGURED);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("email, status").eq("id", userId).single();
  if (!profile) return fail("المستخدم غير موجود.");
  if (profile.status !== "active") return fail("فعّل المستخدم أولاً.");
  const sent = await emailInvitation(userId, profile.email);
  revalidatePath(PAGE);
  return sent ? { ok: true, message: `أُرسلت الدعوة إلى ${profile.email}.` } : fail("تعذّر إرسال الدعوة. انتظر قليلاً ثم أعد المحاولة.");
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
  // Without the ban the user could keep signing in, so change nothing.
  if (!adminConfigured()) throw new Error("SUPABASE_SECRET_KEY is not set");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw new Error("Could not update user status");

  // A ban stops the disabled user from signing in or refreshing an existing session.
  await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: status === "disabled" ? "876000h" : "none",
  });
  revalidatePath(PAGE);
}

/** Deletes a trial account outright (system administrator). The person record stays; links to the user are cleared and the audit log keeps the rest. */
export async function deleteUser(userId: string) {
  const viewer = await requirePage("/admin/roles", LEVELS.manage);
  if (userId === viewer.id) throw new Error("Cannot delete yourself");
  if (!adminConfigured()) throw new Error("SUPABASE_SECRET_KEY is not set");
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error("Could not delete user");
  revalidatePath(PAGE);
}
