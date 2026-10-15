"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

/** Passes a warning-level check with a written reason; recorded in the audit log. */
export async function overrideCheck(meetingId: string, rule: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500);
  if (!reason) return { ok: false, message: "اكتب السبب." };
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_overrides").insert({ meeting_id: meetingId, rule, reason });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "سُجّل السبب." };
}
