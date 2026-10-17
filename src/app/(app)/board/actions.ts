"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { TERM_YEARS, termEnd } from "@/lib/org";
import { companyProfile } from "@/lib/live-server";
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
  const maxYears = (await companyProfile(await createClient()))?.max_term_years ?? 4;
  if (years > maxYears) return { ok: false, message: `نظام الشركة الأساس يحدد الدورة بـ ${maxYears} سنوات كحد أقصى.` };
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

/** Adds a person (existing or new) to executive management, for the disclosures register. */
export async function addExecutive(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.edit);
  const title = String(form.get("executive_title") ?? "").trim().slice(0, 120);
  if (!title) return { ok: false, message: "اكتب المسمى التنفيذي." };
  const supabase = await createClient();
  const person = await resolvePerson(supabase, form);
  if ("error" in person) return { ok: false, message: person.error };
  const { error } = await supabase.from("people").update({ executive_title: title }).eq("id", person.id);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(PAGE);
  return { ok: true, message: "أُضيف إلى الإدارة التنفيذية." };
}

export async function removeExecutive(personId: string) {
  await requirePage(PAGE, LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("people").update({ executive_title: null }).eq("id", personId);
  if (error) throw new Error("Could not update person");
  revalidatePath(PAGE);
}

