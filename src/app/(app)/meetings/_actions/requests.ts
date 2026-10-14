"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { isOneOf } from "@/lib/org";
import { ITEM_KINDS } from "@/lib/meetings";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

/** A department asks for an item on the board's or a committee's agenda. RLS checks delegation. */
export async function submitAgendaRequest(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await getViewer())) return { ok: false, message: "سجّل الدخول أولاً." };
  const [bodyKind, bodyId] = String(form.get("body") ?? "").split(":");
  const departmentId = text(form, "department_id");
  const title = text(form, "title");
  const kind = form.get("kind");
  if (!departmentId || !bodyId || !title || !isOneOf(kind, ITEM_KINDS)) {
    return { ok: false, message: "أكمل الحقول المطلوبة." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_requests").insert({
    department_id: departmentId,
    board_id: bodyKind === "board" ? bodyId : null,
    committee_id: bodyKind === "committee" ? bodyId : null,
    title,
    kind,
    description: text(form, "description"),
  });
  if (error) return { ok: false, message: "تعذّر إرسال الطلب. تأكد أنك مخوّل عن هذه الإدارة." };
  revalidatePath("/meetings");
  return { ok: true, message: "أُرسل الطلب للمراجعة." };
}

/** Accepting a request adds it to the chosen meeting's agenda. */
export async function reviewAgendaRequest(requestId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const decision = String(form.get("decision") ?? "");
  const note = text(form, "review_note");
  const supabase = await createClient();

  if (decision === "rejected") {
    if (!note) return { ok: false, message: "اذكر سبب الرفض." };
    const { error } = await supabase.from("agenda_requests").update({ status: "rejected", review_note: note }).eq("id", requestId);
    if (error) return { ok: false, message: "تعذّر الحفظ." };
  } else {
    const meetingId = text(form, "meeting_id");
    if (!meetingId) return { ok: false, message: "اختر الاجتماع الذي يُضاف إليه البند." };
    const { data: request } = await supabase
      .from("agenda_requests")
      .select("title, description, kind, department_id")
      .eq("id", requestId)
      .single();
    if (!request) return { ok: false, message: "الطلب غير موجود." };
    const { data: last } = await supabase
      .from("agenda_items")
      .select("position")
      .eq("meeting_id", meetingId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: item, error } = await supabase
      .from("agenda_items")
      .insert({ ...request, meeting_id: meetingId, position: (last?.position ?? 0) + 1 })
      .select("id")
      .single();
    if (error || !item) return { ok: false, message: "تعذّرت إضافة البند." };
    await supabase
      .from("agenda_requests")
      .update({ status: "accepted", review_note: note, agenda_item_id: item.id })
      .eq("id", requestId);
    revalidatePath(`/meetings/${meetingId}`);
  }
  revalidatePath("/meetings");
  return { ok: true, message: decision === "rejected" ? "رُفض الطلب." : "قُبل الطلب وأُضيف للأجندة." };
}
