"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { AUTHORIZATIONS, RESTRICTABLE } from "@/lib/authority";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const done = () => {
  revalidatePath("/admin/company");
  revalidatePath("/meetings", "layout");
};

/** Board powers the company's bylaws (or an assembly) restrict. */
export async function saveRestrictions(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/admin/company", LEVELS.edit);
  const restricted = fd.getAll("restricted").map(String).filter((k) => isOneOf(k, RESTRICTABLE));
  const supabase = await createClient();
  const { error } = await supabase.from("company_profile").update({ bylaws_restrictions: restricted }).eq("id", true);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  done();
  return { ok: true, message: "حُفظت قيود النظام الأساس." };
}

/** Records a General Assembly authorization the board may act under. */
export async function addAuthorization(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/admin/company", LEVELS.edit);
  const kind = fd.get("kind");
  const granted = String(fd.get("granted_on") ?? "");
  const expires = String(fd.get("expires_on") ?? "") || null;
  if (!isOneOf(kind, AUTHORIZATIONS) || !/^\d{4}-\d{2}-\d{2}$/.test(granted)) return { ok: false, message: "اختر نوع التفويض وتاريخ قرار الجمعية." };
  if (expires && expires < granted) return { ok: false, message: "تاريخ الانتهاء قبل تاريخ القرار." };
  const supabase = await createClient();
  const { error } = await supabase.from("ga_authorizations").insert({ kind, granted_on: granted, expires_on: expires, assembly_reference: String(fd.get("assembly_reference") ?? "").trim() || null });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  done();
  return { ok: true, message: "سُجّل التفويض." };
}

export async function removeAuthorization(id: string) {
  await requirePage("/admin/company", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("ga_authorizations").delete().eq("id", id);
  done();
}
