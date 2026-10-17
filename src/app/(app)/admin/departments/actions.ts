"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/departments";
// Departments are managed on the users page; refresh both.
const refresh = () => {
  revalidatePath(PAGE);
  revalidatePath("/admin/users");
};

export async function createDepartment(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.edit);
  const name = String(form.get("name") ?? "").trim();
  const code = String(form.get("code") ?? "").trim().toUpperCase() || null;
  if (!name) return { ok: false, message: "اسم الإدارة مطلوب." };

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({ name, code });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "يوجد إدارة بنفس الاسم أو الرمز." : "تعذّر إنشاء الإدارة." };
  }
  refresh();
  return { ok: true, message: "أُنشئت الإدارة." };
}

export async function setDepartmentStatus(departmentId: string, status: "active" | "archived") {
  await requirePage(PAGE, LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("departments").update({ status }).eq("id", departmentId);
  if (error) throw new Error("Could not update department");
  refresh();
}

export async function addDelegate(departmentId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.edit);
  const userId = String(form.get("user_id") ?? "");
  if (!userId) return { ok: false, message: "اختر المستخدم." };

  const supabase = await createClient();
  const { error } = await supabase.from("department_delegates").insert({ department_id: departmentId, user_id: userId });
  if (error) return { ok: false, message: error.code === "23505" ? "هذا المستخدم مخوّل بالفعل." : "تعذّر الإضافة." };
  refresh();
  return { ok: true, message: "أُضيف المخوّل." };
}

export async function removeDelegate(departmentId: string, userId: string) {
  await requirePage(PAGE, LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase
    .from("department_delegates")
    .delete()
    .eq("department_id", departmentId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not remove delegate");
  refresh();
}

/** Deletes a trial department (system administrator); its delegations go with it. */
export async function deleteDepartment(departmentId: string) {
  await requirePage("/admin/roles", LEVELS.manage);
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").delete().eq("id", departmentId).select("id");
  if (error || !data?.length) throw new Error("Could not delete department");
  refresh();
}
