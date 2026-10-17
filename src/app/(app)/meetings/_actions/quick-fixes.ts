"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { hamzaSlips } from "@/lib/spelling";

// One-click fixes offered by the preparation checklist's item chips.

const refresh = (meetingId: string) => revalidatePath(`/meetings/${meetingId}`);

/** Makes a department ("department:<id>") or a user ("user:<id>") the item's owner. */
export async function setItemOwner(meetingId: string, itemId: string, target: string): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const [kind, id] = target.split(":");
  if (!id || (kind !== "department" && kind !== "user")) return { ok: false, message: "اختر المسؤول." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_items")
    .update({ department_id: kind === "department" ? id : null, owner_user_id: kind === "user" ? id : null })
    .eq("id", itemId)
    .eq("meeting_id", meetingId);
  if (error) return { ok: false, message: "تعذّر حفظ المسؤول." };
  refresh(meetingId);
  return { ok: true, message: "حُدّد مسؤول البند." };
}

/** Sets one deadline for every requirement of the item not yet sent. */
export async function setItemDueDates(meetingId: string, itemId: string, date: string): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "اختر تاريخاً." };
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_item_requirements").update({ due_date: date }).eq("agenda_item_id", itemId).eq("meeting_id", meetingId).eq("status", "draft");
  if (error) return { ok: false, message: "تعذّر حفظ المواعيد." };
  refresh(meetingId);
  return { ok: true, message: "ضُبطت المواعيد." };
}

/** Applies the spelling fixes the checklist suggests to the meeting title (worked out again here, not taken from the page). */
export async function fixMeetingTitleSpelling(meetingId: string): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { data: meeting } = await supabase.from("meetings").select("title").eq("id", meetingId).maybeSingle();
  if (!meeting?.title) return { ok: false, message: "لا يوجد عنوان." };
  const { fixed, words } = hamzaSlips(meeting.title);
  if (!words.length) return { ok: true, message: "العنوان سليم." };
  const { error } = await supabase.from("meetings").update({ title: fixed }).eq("id", meetingId);
  if (error) return { ok: false, message: "تعذّر تصحيح العنوان." };
  refresh(meetingId);
  return { ok: true, message: "صُحّح العنوان." };
}
