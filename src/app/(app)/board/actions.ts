"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { BOARD_CATEGORIES, BOARD_POSITIONS, isOneOf, membershipError, TERM_YEARS, termEnd } from "@/lib/org";
import { resolvePerson } from "@/lib/people";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/board";

export async function saveBoard(boardId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const name = String(form.get("name") ?? "").trim();
  const term_start = String(form.get("term_start") ?? "");
  const years = Number(form.get("term_years"));
  if (!name || !term_start) return { ok: false, message: "اسم المجلس وتاريخ بداية الدورة مطلوبان." };
  if (!TERM_YEARS.includes(years as (typeof TERM_YEARS)[number])) return { ok: false, message: "اختر مدة الدورة." };
  // The end date is always derived on the server, never taken from the form.
  const term_end = termEnd(term_start, years);
  if (!term_end) return { ok: false, message: "تاريخ البداية غير صحيح." };

  const supabase = await createClient();
  const row = { name, term_start, term_end };
  const { error } = boardId
    ? await supabase.from("boards").update(row).eq("id", boardId)
    : await supabase.from("boards").insert(row);
  if (error) return { ok: false, message: "تعذّر حفظ بيانات المجلس." };
  revalidatePath(PAGE);
  return { ok: true, message: "حُفظت بيانات المجلس." };
}

export async function addBoardMember(boardId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.edit);
  const position = form.get("position");
  const category = form.get("category");
  if (!isOneOf(position, BOARD_POSITIONS) || !isOneOf(category, BOARD_CATEGORIES)) {
    return { ok: false, message: "اختر المنصب والصفة." };
  }
  const supabase = await createClient();
  const person = await resolvePerson(supabase, form);
  if ("error" in person) return { ok: false, message: person.error };

  const { error } = await supabase.from("board_members").insert({
    board_id: boardId,
    person_id: person.id,
    position,
    category,
    start_date: String(form.get("start_date") || "") || undefined,
  });
  if (error) return { ok: false, message: membershipError(error.code, error.message) };
  revalidatePath(PAGE);
  return { ok: true, message: "أُضيف العضو." };
}

export async function endBoardMembership(membershipId: string) {
  await requirePage(PAGE, LEVELS.edit);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("board_members")
    .update({ status: "ended", end_date: today })
    .eq("id", membershipId);
  if (error) throw new Error("Could not end membership");
  revalidatePath(PAGE);
}
