"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

/** An invitee asks for a document or clarification on an agenda item (RLS checks the invitation). */
export async function requestInfo(meetingId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "سجّل الدخول أولاً." };
  const item = String(fd.get("agenda_item_id") ?? "");
  const question = String(fd.get("question") ?? "").trim().slice(0, 4000);
  if (!item || !question) return { ok: false, message: "اختر البند واكتب طلبك." };
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_info_requests").insert({ meeting_id: meetingId, agenda_item_id: item, question, person_id: viewer.personId });
  if (error) return { ok: false, message: "تعذّر إرسال الطلب." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "أُرسل الطلب إلى أمين السر." };
}

export async function answerInfo(meetingId: string, requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requirePage("/meetings", LEVELS.edit);
  const response = String(fd.get("response") ?? "").trim().slice(0, 4000);
  if (!response) return { ok: false, message: "اكتب الرد." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_info_requests")
    .update({ response, responded_by: viewer.id, responded_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/governance-office");
  return { ok: true, message: "أُرسل الرد." };
}
