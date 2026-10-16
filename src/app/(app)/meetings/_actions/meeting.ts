"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { isOneOf } from "@/lib/org";
import { MEETING_MODES, MEETING_TYPES, riyadhTimestamp } from "@/lib/meetings";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { stageDone } from "@/lib/journey";
import { loadJourney } from "./journey-data";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

function readDetails(form: FormData) {
  const title = text(form, "title");
  const meetingType = form.get("meeting_type");
  const mode = form.get("mode");
  const startsAt = riyadhTimestamp(String(form.get("date") ?? ""), String(form.get("time") ?? ""));
  const duration = Number(form.get("duration_minutes"));
  if (!title) return { error: "عنوان الاجتماع مطلوب." };
  if (!startsAt) return { error: "حدد تاريخ الاجتماع ووقته." };
  if (!isOneOf(meetingType, MEETING_TYPES) || !isOneOf(mode, MEETING_MODES)) return { error: "اختر نوع الاجتماع وطريقة انعقاده." };
  if (!Number.isInteger(duration) || duration < 15 || duration > 720) return { error: "المدة بين 15 و720 دقيقة." };
  const location = text(form, "location");
  const virtualLink = text(form, "virtual_link");
  if (mode !== "virtual" && !location) return { error: "حدد مكان الاجتماع." };
  if (mode !== "in_person" && !virtualLink?.startsWith("https://")) return { error: "أدخل رابط الاجتماع عن بُعد (يبدأ بـ https://)." };
  return {
    row: {
      title,
      meeting_type: meetingType,
      mode,
      starts_at: startsAt,
      duration_minutes: duration,
      location: mode === "virtual" ? null : location,
      location_en: mode === "virtual" ? null : text(form, "location_en"),
      virtual_link: mode === "in_person" ? null : virtualLink,
    },
  };
}

const REMOTE_OFF = "الاجتماعات والحضور عن بُعد موقوفة في إعدادات الموقع؛ اختر «حضوري».";
const remoteOff = (error: { message?: string } | null) => Boolean(error?.message?.includes("remote meetings are turned off"));

export async function createMeeting(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const [kind, bodyId] = String(form.get("body") ?? "").split(":");
  if (!bodyId || (kind !== "board" && kind !== "committee")) return { ok: false, message: "اختر المجلس أو اللجنة." };
  const details = readDetails(form);
  if ("error" in details) return { ok: false, message: details.error! };

  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({ ...details.row, board_id: kind === "board" ? bodyId : null, committee_id: kind === "committee" ? bodyId : null })
    .select("id")
    .single();
  if (error || !meeting) return { ok: false, message: remoteOff(error) ? REMOTE_OFF : "تعذّر إنشاء الاجتماع." };

  // Invite the body's active members; guests are added later from the meeting page.
  const { data: members } = await supabase
    .from(kind === "board" ? "board_members" : "committee_members")
    .select("person_id")
    .eq(kind === "board" ? "board_id" : "committee_id", bodyId)
    .eq("status", "active");
  if (members?.length) {
    await supabase
      .from("meeting_invitees")
      .insert(members.map((m) => ({ meeting_id: meeting.id, person_id: m.person_id, kind: "member" })));
  }
  redirect(`/meetings/${meeting.id}`);
}

export async function updateMeeting(meetingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const details = readDetails(form);
  if ("error" in details) return { ok: false, message: details.error! };
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(details.row).eq("id", meetingId);
  if (error) return { ok: false, message: remoteOff(error) ? REMOTE_OFF : "تعذّر حفظ التعديلات." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "حُفظت التعديلات." };
}

/** Moves a meeting between draft, scheduled (visible to invitees) and cancelled. */
export async function setMeetingStatus(meetingId: string, status: "draft" | "scheduled" | "cancelled") {
  await requirePage("/meetings", status === "cancelled" ? LEVELS.manage : LEVELS.edit);
  const supabase = await createClient();
  if (status === "scheduled") await requireStage(supabase, meetingId, 1);
  const { error } = await supabase.from("meetings").update({ status }).eq("id", meetingId);
  if (error) throw new Error("Could not update meeting status");
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/meetings", "layout");
}

/** Publishing the pack lets invitees open the meeting documents. */
export async function setPackPublished(meetingId: string, published: boolean) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  if (published) await requireStage(supabase, meetingId, 1);
  const { error } = await supabase
    .from("meetings")
    .update({ pack_published_at: published ? new Date().toISOString() : null })
    .eq("id", meetingId);
  if (error) throw new Error("Could not update pack");
  revalidatePath(`/meetings/${meetingId}`);
}

export async function addGuest(meetingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const personId = String(form.get("person_id") ?? "");
  if (!personId) return { ok: false, message: "اختر الشخص." };
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_invitees").insert({ meeting_id: meetingId, person_id: personId, kind: "guest" });
  if (error) return { ok: false, message: error.code === "23505" ? "هذا الشخص مدعو بالفعل." : "تعذّرت الإضافة." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "أُضيف المدعو." };
}

export async function removeInvitee(meetingId: string, personId: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_invitees").delete().eq("meeting_id", meetingId).eq("person_id", personId);
  if (error) throw new Error("Could not remove invitee");
  revalidatePath(`/meetings/${meetingId}`);
}

export async function respondRsvp(meetingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await getViewer())) return { ok: false, message: "سجّل الدخول أولاً." };
  const response = String(form.get("response") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_rsvp", {
    p_meeting: meetingId,
    p_response: response,
    p_note: String(form.get("note") ?? ""),
  });
  if (error) return { ok: false, message: "تعذّر حفظ ردك." };
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, message: "حُفظ ردك على الدعوة." };
}

/** Refuses to move on while a stage still has unmet checks (the journey's server-side guard). */
async function requireStage(supabase: Awaited<ReturnType<typeof createClient>>, meetingId: string, stage: number) {
  const checks = await loadJourney(supabase, meetingId);
  if (checks && !stageDone(checks, stage)) throw new Error(`Stage ${stage} is not complete`);
}

/** Deletes a meeting and everything under it (system administrator, while data is trial). */
export async function deleteMeeting(meetingId: string) {
  await requirePage("/admin/roles", LEVELS.manage);
  const supabase = await createClient();
  const { data, error } = await supabase.from("meetings").delete().eq("id", meetingId).select("id");
  if (error || !data?.length) throw new Error("Could not delete meeting");
  revalidatePath("/", "layout");
}

/** Deletes several trial meetings at once (system administrator). */
export async function deleteMeetings(meetingIds: string[]) {
  await requirePage("/admin/roles", LEVELS.manage);
  const ids = meetingIds.filter((id) => /^[0-9a-f-]{36}$/.test(id)).slice(0, 100);
  if (!ids.length) return;
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().in("id", ids);
  if (error) throw new Error("Could not delete meetings");
  revalidatePath("/", "layout");
}
