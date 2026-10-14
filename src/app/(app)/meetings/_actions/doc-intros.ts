"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { cleanRich } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

/** Saves the introduction printed at the top of the agenda or the attendance sheet. */
export async function saveDocIntro(meetingId: string, doc: "agenda" | "attendance", _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ [`${doc}_intro`]: cleanRich(form.get("intro")), [`${doc}_intro_en`]: cleanRich(form.get("intro_en")) })
    .eq("id", meetingId);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "حُفظت المقدمة." };
}
