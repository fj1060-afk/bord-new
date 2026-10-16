"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { isOneOf } from "@/lib/org";
import { templateGaps } from "@/lib/item-review";
import { ITEM_KINDS, moveItem } from "@/lib/meetings";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

function readItem(form: FormData) {
  const title = text(form, "title");
  const kind = form.get("kind");
  const duration = form.get("duration_minutes") ? Number(form.get("duration_minutes")) : null;
  if (!title) return { error: "عنوان البند مطلوب." };
  const gap = templateGaps(title)[0];
  if (gap) return { error: `لا يمكن حفظ البند: ${gap.text}` };
  if (!isOneOf(kind, ITEM_KINDS)) return { error: "اختر نوع البند." };
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 480)) return { error: "المدة غير صحيحة." };
  return {
    row: {
      title,
      title_en: text(form, "title_en"),
      kind,
      duration_minutes: duration,
      description: text(form, "description"),
      presenter: text(form, "presenter"),
      presenter_user_id: text(form, "presenter_user_id"),
      ...ownerColumns(text(form, "owner")),
    },
  };
}

export async function saveAgendaItem(meetingId: string, itemId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const item = readItem(form);
  if ("error" in item) return { ok: false, message: item.error! };
  const supabase = await createClient();

  if (itemId) {
    const { error } = await supabase.from("agenda_items").update(item.row).eq("id", itemId);
    if (error) return { ok: false, message: "تعذّر حفظ البند." };
  } else {
    const { data: last } = await supabase
      .from("agenda_items")
      .select("position")
      .eq("meeting_id", meetingId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase
      .from("agenda_items")
      .insert({ ...item.row, meeting_id: meetingId, position: (last?.position ?? 0) + 1 });
    if (error) return { ok: false, message: "تعذّرت إضافة البند." };
  }
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: itemId ? "حُفظ البند." : "أُضيف البند." };
}

export async function moveAgendaItem(meetingId: string, itemId: string, direction: "up" | "down") {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { data: items } = await supabase.from("agenda_items").select("id, position").eq("meeting_id", meetingId);
  for (const { id, position } of moveItem(items ?? [], itemId, direction)) {
    await supabase.from("agenda_items").update({ position }).eq("id", id);
  }
  revalidatePath(`/meetings/${meetingId}`);
}

export async function removeAgendaItem(meetingId: string, itemId: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_items").delete().eq("id", itemId);
  if (error) throw new Error("Could not remove agenda item");
  revalidatePath(`/meetings/${meetingId}`);
}

export async function requestDocument(meetingId: string, itemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const title = text(form, "title");
  const target = ownerColumns(text(form, "target"));
  if (!title || (!target.department_id && !target.owner_user_id)) return { ok: false, message: "حدد المستند والمطلوب منه." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_requests")
    .insert({ agenda_item_id: itemId, department_id: target.department_id, assignee_user_id: target.owner_user_id, title, due_date: text(form, "due_date") });
  if (error) return { ok: false, message: "تعذّر إرسال الطلب." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "أُرسل طلب المستند." };
}

export async function reviewDocumentRequest(meetingId: string, requestId: string, decision: "accepted" | "returned", note?: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_requests")
    .update({ status: decision, review_note: note?.trim() || null })
    .eq("id", requestId);
  if (error) throw new Error("Could not review request");
  revalidatePath(`/meetings/${meetingId}`);
}

/** "department:<id>" or "user:<id>" from a target select, as table columns. */
function ownerColumns(value: string | null) {
  const [kind, id] = (value ?? "").split(":");
  return { department_id: kind === "department" && id ? id : null, owner_user_id: kind === "user" && id ? id : null };
}
