"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer } from "@/lib/auth";
import { isOneOf } from "@/lib/org";
import { REMARK_KINDS } from "@/lib/secretary";
import { createClient } from "@/lib/supabase/server";

/** Members comment on the draft under review; organizers record reservations, dissent and recusals. RLS decides who may. */
export async function addRemark(meetingId: string, minutesId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "سجّل الدخول أولاً." };
  const kind = String(form.get("kind") ?? "comment");
  const note = String(form.get("note") ?? "").trim().slice(0, 4000);
  if (!isOneOf(kind, REMARK_KINDS)) return { ok: false, message: "اختر النوع." };
  if (!note) return { ok: false, message: "اكتب الملاحظة." };
  const person = kind === "comment" ? viewer.personId : String(form.get("person_id") ?? "") || null;
  if (kind !== "comment" && !person) return { ok: false, message: "اختر العضو." };
  const supabase = await createClient();
  const { error } = await supabase.from("minutes_remarks").insert({
    minutes_id: minutesId,
    kind,
    note,
    person_id: person,
    resolution_id: String(form.get("resolution_id") ?? "") || null,
  });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "سُجّلت." };
}

export async function deleteRemark(meetingId: string, remarkId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("minutes_remarks").delete().eq("id", remarkId);
  if (error) throw new Error("Could not delete remark");
  revalidatePath(`/meetings/${meetingId}`);
}
