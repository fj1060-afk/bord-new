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
      watermark_documents: on("watermark_documents"),
      documents_view_only: on("documents_view_only"),
      updated_by: user.user?.id ?? null,
    })
    .eq("id", true);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "حُفظت الإعدادات." };
}

/** Saves how meetings are numbered: the format and each board's and committee's code. Applies to invitations issued from now on. */
export async function saveNumbering(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/admin/settings", LEVELS.manage);
  const separator = String(fd.get("separator") ?? "-");
  const digits = Number(fd.get("digits"));
  if (!["-", "/", ".", "_"].includes(separator) || ![2, 3, 4].includes(digits)) return { ok: false, message: "صيغة الترقيم غير صالحة." };
  const codes: Record<string, string> = {};
  for (const [key, value] of fd.entries()) if (key.startsWith("code:")) codes[key.slice(5)] = String(value).trim().toUpperCase();
  if (Object.values(codes).some((c) => !/^[A-Z]{1,6}$/.test(c))) return { ok: false, message: "الرمز من حرف إلى ستة أحرف إنجليزية." };
  const repeated = Object.values(codes).filter((c, i, all) => all.indexOf(c) !== i);
  if (repeated.length) return { ok: false, message: `الرمز مكرر بين الجهات: ${[...new Set(repeated)].join("، ")}` };
  const supabase = await createClient();
  const { error } = await supabase.from("service_settings").update({ meeting_number_separator: separator, meeting_number_digits: digits, meeting_number_with_year: fd.get("with_year") === "on" }).eq("id", true);
  const { error: codeError } = error ? { error } : await supabase.rpc("set_body_codes", { p_codes: codes });
  if (error || codeError) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath("/admin/settings");
  return { ok: true, message: "حُفظت إعدادات الترقيم، وتسري على الدعوات التي تصدر من الآن." };
}
