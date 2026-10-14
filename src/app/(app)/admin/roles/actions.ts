"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { navItems } from "@/config/navigation";
import { requirePage } from "@/lib/auth";
import { clampLevel, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/roles";

export async function savePermissions(roleId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("key").eq("id", roleId).single();
  if (!role) return { ok: false, message: "الدور غير موجود." };
  if (role.key === "system_admin") return { ok: false, message: "صلاحيات مدير النظام ثابتة." };

  const rows = navItems
    .map((item) => ({ role_id: roleId, page: item.href, level: clampLevel(Number(form.get(item.href))) }))
    .filter((row) => row.level > 0);

  const { error: deleteError } = await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (deleteError) return { ok: false, message: "تعذّر حفظ الصلاحيات." };
  if (rows.length) {
    const { error } = await supabase.from("role_permissions").insert(rows);
    if (error) return { ok: false, message: "تعذّر حفظ الصلاحيات." };
  }
  revalidatePath(PAGE);
  return { ok: true, message: "حُفظت الصلاحيات." };
}

export async function createRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  if (!name) return { ok: false, message: "اسم الدور مطلوب." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert({ key: `custom_${crypto.randomUUID().slice(0, 8)}`, name, description })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "تعذّر إنشاء الدور." };
  redirect(`${PAGE}?role=${data.id}`);
}
