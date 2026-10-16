"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { aiConfig } from "@/lib/ai";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function endSession(sessionId: string) {
  await requirePage("/admin/settings", LEVELS.manage);
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_session", { p_session: sessionId });
  if (error) throw new Error("Could not end session");
  revalidatePath("/admin/settings");
}

/** Saves the site's switches: outside services, meetings and decisions, privacy. */
export async function saveServices(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/admin/settings", LEVELS.manage);
  const on = (k: string) => fd.get(k) === "on";
  const ai = on("ai_enabled");
  const confirmed = on("ai_no_retention_confirmed");
  if (ai && !confirmed) return { ok: false, message: "لا يُفعّل الذكاء الاصطناعي قبل تأكيد أن المزوّد لا يحتفظ بالبيانات." };
  if (ai && !aiConfig(process.env).ready) return { ok: false, message: "مزوّد الذكاء الاصطناعي غير مهيأ في متغيرات البيئة بعد." };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("service_settings")
    .update({
      ai_enabled: ai,
      ai_no_retention_confirmed: confirmed,
      external_translation: on("external_translation"),
      external_spelling: on("external_spelling"),
      remote_meetings: on("remote_meetings"),
      circular_enabled: on("circular_enabled"),
      pack_requires_disclosure: on("pack_requires_disclosure"),
      hide_contacts: on("hide_contacts"),
      updated_by: user.user?.id ?? null,
    })
    .eq("id", true);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "حُفظت الإعدادات." };
}
