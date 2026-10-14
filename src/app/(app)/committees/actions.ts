"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { COMMITTEE_KINDS, COMMITTEE_POSITIONS, isOneOf, membershipError } from "@/lib/org";
import { resolvePerson } from "@/lib/people";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/committees";

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
    revalidatePath(`${PAGE}/${committeeId}`);
    return { ok: true, message: "حُفظت بيانات اللجنة." };
  }

  const { data: board } = await supabase.from("boards").select("id").eq("status", "active").limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("committees")
    .insert({ name, mandate, kind, board_id: board?.id ?? null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "تعذّر إنشاء اللجنة." };
  redirect(`${PAGE}/${data.id}`);
}

export async function setCommitteeStatus(committeeId: string, status: "active" | "archived") {
  await requirePage(PAGE, LEVELS.manage);
  const supabase = await createClient();
  const { error } = await supabase.from("committees").update({ status }).eq("id", committeeId);
  if (error) throw new Error("Could not update committee");
  revalidatePath(PAGE);
  revalidatePath(`${PAGE}/${committeeId}`);
}

export async function addCommitteeMember(committeeId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage(PAGE, LEVELS.edit);
  const position = form.get("position");
  if (!isOneOf(position, COMMITTEE_POSITIONS)) return { ok: false, message: "اختر المنصب." };

  const supabase = await createClient();
  const person = await resolvePerson(supabase, form);
  if ("error" in person) return { ok: false, message: person.error };

  const { error } = await supabase.from("committee_members").insert({
    committee_id: committeeId,
    person_id: person.id,
    position,
    start_date: String(form.get("start_date") || "") || undefined,
  });
  if (error) return { ok: false, message: membershipError(error.code, error.message) };
  revalidatePath(`${PAGE}/${committeeId}`);
  return { ok: true, message: "أُضيف العضو." };
}

export async function endCommitteeMembership(committeeId: string, membershipId: string) {
  await requirePage(PAGE, LEVELS.edit);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("committee_members")
    .update({ status: "ended", end_date: today })
    .eq("id", membershipId);
  if (error) throw new Error("Could not end membership");
  revalidatePath(`${PAGE}/${committeeId}`);
}
