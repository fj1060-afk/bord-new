"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { COMMITTEE_KINDS, isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/committees";
/** Default meeting-number code for a new committee (editable under settings → meeting numbering). */
const COMMITTEE_CODES: Record<string, string> = { audit: "AC", remuneration_nomination: "NRC", nomination: "NC", remuneration: "RMC", executive: "EXC", risk: "RC", other: "CM" };

export async function saveCommittee(committeeId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.manage);
  const name = String(form.get("name") ?? "").trim();
  const mandate = String(form.get("mandate") ?? "").trim() || null;
  const kindRaw = String(form.get("kind") ?? "other");
  const kind = isOneOf(kindRaw, COMMITTEE_KINDS) ? kindRaw : "other";
  if (!name) return { ok: false, message: "اسم اللجنة مطلوب." };

  const supabase = await createClient();
  if (committeeId) {
    const { error } = await supabase.from("committees").update({ name, mandate, kind }).eq("id", committeeId);
    if (error) return { ok: false, message: "تعذّر حفظ اللجنة." };
    // The sidebar lists committees by name.
    revalidatePath("/", "layout");
    return { ok: true, message: "حُفظت بيانات اللجنة." };
  }

  const { data: board } = await supabase.from("boards").select("id").eq("status", "active").limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("committees")
    .insert({ name, mandate, kind, code: COMMITTEE_CODES[kind], board_id: board?.id ?? null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "تعذّر إنشاء اللجنة." };
  redirect(`${PAGE}/${data.id}/members`);
}

export async function setCommitteeStatus(committeeId: string, status: "active" | "archived") {
  await requirePage(PAGE, LEVELS.manage);
  const supabase = await createClient();
  const { error } = await supabase.from("committees").update({ status }).eq("id", committeeId);
  if (error) throw new Error("Could not update committee");
  revalidatePath("/", "layout");
  revalidatePath(`${PAGE}/${committeeId}`, "layout");
}

/** Deletes a committee with no meetings or circular resolutions (system administrator, while data is trial). */
export async function deleteCommittee(committeeId: string) {
  await requirePage("/admin/roles", LEVELS.manage);
  const supabase = await createClient();
  const { error } = await supabase.from("committees").delete().eq("id", committeeId);
  if (error) throw new Error("Could not delete committee");
  revalidatePath("/", "layout");
  redirect(PAGE);
}

