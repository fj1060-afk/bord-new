"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { contactFields } from "@/lib/contact-rules";
import { passwordProblem } from "@/lib/password";
import { isTestDepartment, isTestPerson } from "@/lib/test-data";
import { duplicateFields, type Duplicate, type ExistingUser } from "@/lib/user-duplicates";
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

/**
 * Creates the account. With a password the account is ready to sign in;
 * without one, the invitation is sent now or later from the list. It can be
 * attached to a department (as its delegate) and to a board or committee member.
 */
export async function createUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const contact = contactFields(form);
  const email = contact.email ?? "";
  const fullName = String(form.get("full_name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const departmentId = String(form.get("department_id") ?? "");
  const personId = String(form.get("person_id") ?? "");
  const roleIds = form.getAll("role").map(String);
  const sendNow = form.get("intent") === "invite" && !password;
  if (!email || !fullName) return fail("الاسم والبريد الإلكتروني مطلوبان.");
  if (contact.problem) return fail(contact.problem);
  if (roleIds.length === 0) return fail("اختر دوراً واحداً على الأقل.");
  if (password) {
    const problem = passwordProblem(password, { name: fullName, email });
    if (problem) return fail(problem);
  }
  if (!adminConfigured()) return fail(NOT_CONFIGURED);
  const clashes = await userClashes({ name: fullName, email, phone: contact.phone ?? "" });
  if (clashes.length) return fail(`لا يمكن إضافة المستخدم: ${clashes.map((c) => c.message).join(" ")}`);

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    ...(password ? { password } : {}),
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    return fail(error?.code === "email_exists" ? "يوجد مستخدم بهذا البريد." : error?.code === "weak_password" ? "رفض الخادم كلمة المرور لضعفها. اختر أطول." : "تعذّر إنشاء المستخدم. تأكد من البريد وأعد المحاولة.");
  }
  const userId = data.user.id;

  // Profile, roles and links are written with the admin's own session, so RLS and the audit log apply.
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ phone: contact.phone, job_title: String(form.get("job_title") ?? "").trim() || null })
    .eq("id", userId);
  const { error: rolesError } = await supabase.from("user_roles").insert(roleIds.map((role_id) => ({ user_id: userId, role_id })));
  if (rolesError) return fail("أُنشئ المستخدم، لكن تعذّر حفظ الأدوار. عدّلها من القائمة.");
  const linkProblems: string[] = [];
  // Every user is also a person, so they can be chosen as secretary, member or invitee.
  const { error: personError } = await supabase.from("people").insert({ full_name: fullName, email, phone: contact.phone, user_id: userId, job_title: String(form.get("job_title") ?? "").trim() || null });
  if (personError) linkProblems.push("سجل الشخص");
  if (departmentId) {
    const { error: e } = await supabase.from("department_delegates").insert({ department_id: departmentId, user_id: userId });
    if (e) linkProblems.push("الإدارة");
  }
  if (personId) {
    const { data: linked, error: e } = await supabase.from("people").update({ user_id: userId }).eq("id", personId).is("user_id", null).select("id");
    if (e || !linked?.length) linkProblems.push("العضو");
  }
  const linkNote = linkProblems.length ? ` تعذّر ربط ${linkProblems.join(" و")}؛ اربطه يدوياً.` : "";

  revalidatePath(PAGE);
  if (password) return { ok: true, message: `أُنشئ المستخدم ويمكنه الدخول الآن بالبريد وكلمة المرور.${linkNote}` };
  if (!sendNow) return { ok: true, message: `أُنشئ المستخدم. أرسل له الدعوة من القائمة متى شئت.${linkNote}` };
  return (await emailInvitation(userId, email))
    ? { ok: true, message: `أُنشئ المستخدم وأُرسلت الدعوة إلى ${email}.${linkNote}` }
    : fail(`أُنشئ المستخدم، لكن تعذّر إرسال الدعوة. أعد الإرسال من القائمة.${linkNote}`);
}

/** Existing users a new one would repeat (name, email or mobile). */
async function userClashes(candidate: { name?: string; email?: string; phone?: string }): Promise<Duplicate[]> {
  const { data } = await createAdminClient().from("profiles").select("id, full_name, email, phone");
  return duplicateFields(candidate, (data ?? []) as ExistingUser[]);
}

/** Checks a new user's fields as they are typed, so the form can warn before submitting. */
export async function checkNewUser(candidate: { name?: string; email?: string; phone?: string }): Promise<Duplicate[]> {
  await requirePage(PAGE, LEVELS.manage);
  if (!adminConfigured()) return [];
  return userClashes(candidate);
}

/** Sets a user's password directly (system user management); the policy in lib/password applies. */
export async function setUserPassword(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requirePage(PAGE, LEVELS.manage);
  if (userId === viewer.id) return fail("غيّر كلمة مرورك من صفحة تعيين كلمة المرور.");
  if (!adminConfigured()) return fail(NOT_CONFIGURED);
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).single();
  if (!profile) return fail("المستخدم غير موجود.");
  const problem = passwordProblem(password, { name: profile.full_name, email: profile.email });
  if (problem) return fail(problem);
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return fail(error.code === "weak_password" ? "رفض الخادم كلمة المرور لضعفها. اختر أطول." : "تعذّر حفظ كلمة المرور.");
  return { ok: true, message: "حُفظت كلمة المرور الجديدة." };
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
  // Their person goes too unless a seat, invitation or signature still refers to it (the database refuses then).
  await (await createClient()).from("people").delete().eq("user_id", userId);
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error("Could not delete user");
  revalidatePath(PAGE);
}

/**
 * Removes what the end-to-end tests left behind: their people (with seats,
 * invitations, attendance and signatures in trial meetings) and departments.
 * System administrator only; real records are never matched.
 */
export async function purgeTestData(): Promise<ActionState> {
  await requirePage("/admin/roles", LEVELS.manage);
  if (!adminConfigured()) return fail(NOT_CONFIGURED);
  const admin = createAdminClient();
  const { data: people } = await admin.from("people").select("id, full_name");
  const ids = (people ?? []).filter((p) => isTestPerson(p.full_name)).map((p) => p.id);
  if (ids.length) {
    for (const [table, column] of [["minutes_signatures", "person_id"], ["meeting_proxies", "grantor_person_id"], ["meeting_proxies", "holder_person_id"], ["meeting_attendance", "person_id"], ["meeting_invitees", "person_id"], ["committee_members", "person_id"], ["board_members", "person_id"]] as const) {
      const { error } = await admin.from(table).delete().in(column, ids);
      if (error) return fail(`تعذّر حذف ${table}: ${error.message}`);
    }
    const { error } = await admin.from("people").delete().in("id", ids);
    if (error) return fail(`تعذّر حذف الأشخاص: ${error.message}`);
  }
  const { data: departments } = await admin.from("departments").select("id, name");
  const deptIds = (departments ?? []).filter((d) => isTestDepartment(d.name)).map((d) => d.id);
  let deptFailed = 0;
  for (const id of deptIds) if ((await admin.from("departments").delete().eq("id", id)).error) deptFailed++;
  revalidatePath("/", "layout");
  return { ok: true, message: `حُذف ${ids.length} شخص اختبار و${deptIds.length - deptFailed} إدارة اختبار.${deptFailed ? ` بقيت ${deptFailed} إدارة مرتبطة بطلبات.` : ""}` };
}
