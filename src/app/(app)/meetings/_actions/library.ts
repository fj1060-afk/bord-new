"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { scanItem, type ScanResult } from "@/lib/item-scan";
import { BODIES, templates, type Body } from "@/lib/item-templates";
import { companyProfile } from "@/lib/live-server";
import { ITEM_KINDS } from "@/lib/meetings";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

export type LibraryState = (NonNullable<ActionState> & { scan?: ScanResult }) | null;

/**
 * Adds a company item to the agenda item library after the compliance scan;
 * an item with warnings is saved only when the author confirms.
 */
export async function addLibraryItem(_prev: LibraryState, form: FormData): Promise<LibraryState> {
  await requirePage("/meetings", LEVELS.edit);
  const title = text(form, "title");
  const kind = form.get("kind");
  const body = form.get("body");
  if (!title) return { ok: false, message: "صيغة البند مطلوبة." };
  if (!isOneOf(kind, ITEM_KINDS)) return { ok: false, message: "اختر الغرض." };
  if (!isOneOf(body, BODIES)) return { ok: false, message: "اختر الاجتماع الذي يخصه البند." };
  const supabase = await createClient();
  const draft = { title, en: text(form, "title_en"), kind, body: body as Body, needs: text(form, "needs") };
  const scan = scanItem(draft, templates(), (await companyProfile(supabase))?.company_type === "listed_jsc");
  if (!scan.passed && form.get("accept") !== "1") return { ok: false, message: "المسح النظامي وجد ملاحظات؛ عدّل الصيغة أو أكّد الحفظ رغم الملاحظات.", scan };
  const { error } = await supabase
    .from("agenda_item_library")
    .insert({ title, title_en: draft.en, kind, body, category: text(form, "category") ?? "بنود الشركة", needs: draft.needs });
  if (error) return { ok: false, message: error.code === "23505" ? "هذه الصيغة موجودة في المستودع." : "تعذّر الحفظ." };
  revalidatePath("/meetings/library");
  return { ok: true, message: scan.passed ? "اجتاز المسح النظامي وأُضيف إلى المستودع." : "أُضيف إلى المستودع مع الملاحظات.", scan };
}

export async function removeLibraryItem(id: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("agenda_item_library").delete().eq("id", id);
  revalidatePath("/meetings/library");
}
