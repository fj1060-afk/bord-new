"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { ATTENDANCE, nextPendingItem } from "@/lib/live";
import { companyProfile, meetingQuorum } from "@/lib/live-server";
import { riyadhToday } from "@/lib/minutes";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

async function organizer() {
  await requirePage("/meetings", LEVELS.edit);
  return createClient();
}
const refresh = (meetingId: string) => revalidatePath(`/meetings/${meetingId}`);
const now = () => new Date().toISOString();

export async function setAttendance(meetingId: string, personId: string, status: string) {
  const supabase = await organizer();
  if (!isOneOf(status, ATTENDANCE)) throw new Error("Invalid status");
  await supabase.from("meeting_attendance").upsert({ meeting_id: meetingId, person_id: personId, status, recorded_at: now() });
  // A member who attends no longer needs a proxy.
  if (status !== "proxy") await supabase.from("meeting_proxies").delete().eq("meeting_id", meetingId).eq("grantor_person_id", personId);
  refresh(meetingId);
}

export async function setProxy(meetingId: string, grantorId: string, holderId: string): Promise<ActionState> {
  const supabase = await organizer();
  if (!holderId) {
    await supabase.from("meeting_proxies").delete().eq("meeting_id", meetingId).eq("grantor_person_id", grantorId);
    refresh(meetingId);
    return null;
  }
  if ((await companyProfile(supabase))?.proxy_allowed === false) return { ok: false, message: "الإنابة غير مسموحة في نظام الشركة الأساس." };
  const { error } = await supabase
    .from("meeting_proxies")
    .upsert({ meeting_id: meetingId, grantor_person_id: grantorId, holder_person_id: holderId });
  if (error) return { ok: false, message: error.code === "23505" ? "هذا العضو يحمل إنابة أخرى في هذا الاجتماع." : "تعذّر حفظ الإنابة." };
  await supabase.from("meeting_attendance").upsert({ meeting_id: meetingId, person_id: grantorId, status: "proxy", recorded_at: now() });
  refresh(meetingId);
  return { ok: true, message: "حُفظت الإنابة." };
}

export async function setQuorumRequired(meetingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await organizer();
  const raw = String(form.get("quorum_required") ?? "").trim();
  const value = raw ? Number(raw) : null;
  if (value !== null && (!Number.isInteger(value) || value < 1)) return { ok: false, message: "أدخل عدداً صحيحاً." };
  await supabase.from("meetings").update({ quorum_required: value }).eq("id", meetingId);
  refresh(meetingId);
  return { ok: true, message: value ? "حُدّث النصاب." : "عاد النصاب للافتراضي (نصف الأعضاء)." };
}

export async function startMeeting(meetingId: string): Promise<ActionState> {
  const supabase = await organizer();
  // A meeting is held on or after its scheduled day; otherwise the record (and every signature) would predate it.
  const { data: scheduled } = await supabase.from("meetings").select("starts_at").eq("id", meetingId).single();
  if (scheduled && riyadhToday() < riyadhToday(new Date(scheduled.starts_at))) return { ok: false, message: "لم يحن موعد الاجتماع بعد؛ عدّل تاريخه إن كان سيُعقد اليوم." };
  const q = await meetingQuorum(supabase, meetingId);
  if (!q.met) return { ok: false, message: `النصاب غير مكتمل: ${q.counted} من ${q.required} مطلوبين.` };
  const { data: items } = await supabase.from("agenda_items").select("id, position, status").eq("meeting_id", meetingId);
  const first = nextPendingItem(items ?? [], null);
  const { error } = await supabase
    .from("meetings")
    .update({ live_status: "in_progress", started_at: now(), ended_at: null, current_item_id: first?.id ?? null })
    .eq("id", meetingId)
    .eq("live_status", "not_started");
  if (error) return { ok: false, message: "تعذّر بدء الاجتماع." };
  if (first) await supabase.from("agenda_items").update({ started_at: now() }).eq("id", first.id);
  refresh(meetingId);
  return { ok: true, message: "بدأ الاجتماع." };
}

/** Closes the current item as discussed or deferred, with its outcome, and opens the next pending one. */
export async function closeItem(meetingId: string, itemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await organizer();
  const status = form.get("status") === "deferred" ? "deferred" : "discussed";
  await supabase
    .from("agenda_items")
    .update({ status, outcome: String(form.get("outcome") ?? "").trim() || null, ended_at: now() })
    .eq("id", itemId);
  const { data: items } = await supabase.from("agenda_items").select("id, position, status").eq("meeting_id", meetingId);
  const next = nextPendingItem(items ?? [], itemId);
  await supabase.from("meetings").update({ current_item_id: next?.id ?? null }).eq("id", meetingId);
  if (next) await supabase.from("agenda_items").update({ started_at: now() }).eq("id", next.id);
  refresh(meetingId);
  return { ok: true, message: next ? "انتقل الاجتماع للبند التالي." : "انتهت بنود الأجندة." };
}

/** Jumps to a specific pending item (e.g. to take items out of order). */
export async function openItem(meetingId: string, itemId: string) {
  const supabase = await organizer();
  await supabase.from("meetings").update({ current_item_id: itemId }).eq("id", meetingId);
  await supabase.from("agenda_items").update({ started_at: now() }).eq("id", itemId).is("started_at", null);
  refresh(meetingId);
}

export async function toggleBreak(meetingId: string) {
  const supabase = await organizer();
  const { data: open } = await supabase.from("meeting_breaks").select("id").eq("meeting_id", meetingId).is("ended_at", null).maybeSingle();
  if (open) {
    await supabase.from("meeting_breaks").update({ ended_at: now() }).eq("id", open.id);
    await supabase.from("meetings").update({ live_status: "in_progress" }).eq("id", meetingId);
  } else {
    await supabase.from("meeting_breaks").insert({ meeting_id: meetingId });
    await supabase.from("meetings").update({ live_status: "paused" }).eq("id", meetingId);
  }
  refresh(meetingId);
}

export async function endMeeting(meetingId: string) {
  const supabase = await organizer();
  await supabase.from("meeting_breaks").update({ ended_at: now() }).eq("meeting_id", meetingId).is("ended_at", null);
  const { data: meeting } = await supabase.from("meetings").select("current_item_id").eq("id", meetingId).single();
  if (meeting?.current_item_id) {
    await supabase.from("agenda_items").update({ ended_at: now() }).eq("id", meeting.current_item_id).is("ended_at", null);
  }
  await supabase
    .from("meetings")
    .update({ live_status: "ended", ended_at: now(), current_item_id: null })
    .eq("id", meetingId)
    .in("live_status", ["in_progress", "paused"]);
  refresh(meetingId);
}
