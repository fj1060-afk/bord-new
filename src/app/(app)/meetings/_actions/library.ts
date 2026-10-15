"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { ITEM_KINDS } from "@/lib/meetings";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

/** Adds a company item to the agenda item library. */
export async function addLibraryItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const title = text(form, "title");
  const kind = form.get("kind");
  if (!title) return { ok: false, message: "صيغة البند مطلوبة." };
  if (!isOneOf(kind, ITEM_KINDS)) return { ok: false, message: "اختر الغرض." };
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_item_library").insert({ title, kind, category: text(form, "category") ?? "بنود الشركة", needs: text(form, "needs") });
  if (error) return { ok: false, message: error.code === "23505" ? "هذه الصيغة موجودة في المستودع." : "تعذّر الحفظ." };
  revalidatePath("/meetings/library");
  return { ok: true, message: "أُضيف البند إلى المستودع." };
}

export async function removeLibraryItem(id: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("agenda_item_library").delete().eq("id", id);
  revalidatePath("/meetings/library");
}
