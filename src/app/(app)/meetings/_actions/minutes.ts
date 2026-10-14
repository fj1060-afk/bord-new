"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { dateParts } from "@/lib/format";
import { companyProfile, meetingQuorum } from "@/lib/live-server";
import { loadMinutesGaps } from "./minutes-check";
import { englishDate, englishTime } from "@/lib/doc-labels";
import { cleanRich } from "@/lib/rich-text";
import { defaultClosing, defaultIntro } from "@/lib/minutes";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { RESOLUTION_STATUS } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;
const refresh = (meetingId: string) => {
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/minutes");
  revalidatePath("/resolutions");
};

/** Starts the minutes of an ended meeting, pre-filled from attendance and item outcomes. */
export async function createMinutes(meetingId: string): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("number, starts_at, started_at, ended_at, location, location_en, live_status, board_id, board:boards(name), committee:committees(name)")
    .eq("id", meetingId)
    .single();
  if (!meeting || meeting.live_status !== "ended") return { ok: false, message: "يُعد المحضر بعد انتهاء الاجتماع." };

  const [q, profile, { data: attendance }, { data: items }] = await Promise.all([
    meetingQuorum(supabase, meetingId),
    companyProfile(supabase),
    supabase.from("meeting_attendance").select("status").eq("meeting_id", meetingId),
    supabase.from("agenda_items").select("id, position, outcome, status").eq("meeting_id", meetingId).order("position"),
  ]);
  const body = (meeting.board ?? meeting.committee) as unknown as { name: string } | null;
  const held = new Date(meeting.started_at ?? meeting.starts_at);
  const time = (iso: string | null) => (iso ? dateParts(new Date(iso)).time : "—");
  const timeEn = (iso: string | null) => (iso ? englishTime(new Date(iso)) : "—");
  const own = (attendance ?? []).filter((a) => a.status === "present" || a.status === "remote").length;
  const [intro, introEn] = defaultIntro({
    body: body?.name ?? "المجلس",
    bodyEn: meeting.board_id ? "Board of Directors" : "Committee",
    number: meeting.number,
    year: meeting.starts_at.slice(0, 4),
    date: dateParts(held).long,
    dateEn: englishDate(held),
    scheduled: time(meeting.starts_at),
    started: time(meeting.started_at),
    scheduledEn: timeEn(meeting.starts_at),
    startedEn: timeEn(meeting.started_at),
    location: meeting.location,
    locationEn: meeting.location_en,
    own,
    proxies: q.counted - own,
    members: q.members,
    quorumMet: q.met,
  });
  const deferred = (items ?? []).filter((i) => i.status === "deferred").map((i) => i.position);
  const [closing, closingEn] = defaultClosing(time(meeting.ended_at), timeEn(meeting.ended_at), deferred);
  const bilingual = profile?.document_language === "bilingual";
  const { data: minutes, error } = await supabase
    .from("minutes")
    .insert({ meeting_id: meetingId, intro, closing, intro_en: bilingual ? introEn : null, closing_en: bilingual ? closingEn : null })
    .select("id")
    .single();
  if (error || !minutes) return { ok: false, message: "تعذّر إنشاء المحضر." };

  if (items?.length) {
    await supabase.from("minutes_items").insert(items.map((i) => ({ minutes_id: minutes.id, agenda_item_id: i.id, deliberation: i.outcome })));
  }
  refresh(meetingId);
  return { ok: true, message: "أُنشئ المحضر." };
}

export async function saveMinutes(meetingId: string, minutesId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("minutes").update({ intro: cleanRich(form.get("intro")), closing: cleanRich(form.get("closing")), intro_en: cleanRich(form.get("intro_en")), closing_en: cleanRich(form.get("closing_en")) }).eq("id", minutesId).eq("status", "draft");
  if (error) return { ok: false, message: "تعذّر حفظ المحضر." };
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("item:")) continue;
    const itemId = key.slice(5);
    await supabase.from("minutes_items").upsert({
      minutes_id: minutesId,
      agenda_item_id: itemId,
      deliberation: cleanRich(value),
      deliberation_en: cleanRich(form.get(`item_en:${itemId}`)),
    });
  }
  refresh(meetingId);
  return { ok: true, message: "حُفظ المحضر." };
}

/** Freezes a version and asks the attending members to sign it. */
export async function sendForSignature(meetingId: string, minutesId: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const [{ data: minutes }, { data: items }, { data: resolutions }] = await Promise.all([
    supabase.from("minutes").select("version, intro, closing, status").eq("id", minutesId).single(),
    supabase.from("minutes_items").select("agenda_item_id, deliberation").eq("minutes_id", minutesId),
    supabase.from("resolutions").select("number, text, status, votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId),
  ]);
  if (!minutes || minutes.status !== "draft") throw new Error("Minutes are not a draft");
  if ((await loadMinutesGaps(supabase, meetingId, minutesId)).length) throw new Error("Minutes are incomplete");
  const version = minutes.version + 1;
  await supabase.from("minutes_versions").insert({ minutes_id: minutesId, version, snapshot: { intro: minutes.intro, closing: minutes.closing, items, resolutions } });
  await supabase.from("minutes").update({ status: "review", version }).eq("id", minutesId);
  refresh(meetingId);
}

/** Back to draft for corrections; signatures on the old version no longer count. */
export async function reopenMinutes(meetingId: string, minutesId: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("minutes").update({ status: "draft" }).eq("id", minutesId).eq("status", "review");
  refresh(meetingId);
}

export async function signMinutes(meetingId: string, minutesId: string): Promise<ActionState> {
  if (!(await getViewer())) return { ok: false, message: "سجّل الدخول أولاً." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_minutes", { p_minutes: minutesId });
  if (error) return { ok: false, message: "تعذّر التوقيع. لا يوقّع إلا الأعضاء الحاضرون والمحضر بانتظار التوقيع." };
  refresh(meetingId);
  return { ok: true, message: "وُقّع المحضر." };
}

/** Records a paper signature for an attending member who has no account. */
export async function recordManualSignature(meetingId: string, minutesId: string, personId: string) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_manual_signature", { p_minutes: minutesId, p_person: personId });
  if (error) throw new Error("Could not record signature");
  refresh(meetingId);
}

export async function saveResolution(meetingId: string, agendaItemId: string | null, resolutionId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const body = text(form, "text");
  const status = form.get("status");
  if (!body) return { ok: false, message: "نص القرار مطلوب." };
  if (!isOneOf(status, RESOLUTION_STATUS)) return { ok: false, message: "اختر حالة القرار." };
  const vote = (key: string) => (form.get(key) === "" || form.get(key) === null ? null : Number(form.get(key)));
  const row = { text: body, text_en: text(form, "text_en"), status, votes_for: vote("votes_for"), votes_against: vote("votes_against"), votes_abstain: vote("votes_abstain") };
  if (Object.values(row).some((v) => typeof v === "number" && (!Number.isInteger(v) || v < 0))) return { ok: false, message: "أعداد التصويت غير صحيحة." };

  const supabase = await createClient();
  const { error } = resolutionId
    ? await supabase.from("resolutions").update(row).eq("id", resolutionId)
    : await supabase.from("resolutions").insert({ ...row, meeting_id: meetingId, agenda_item_id: agendaItemId });
  if (error) return { ok: false, message: "تعذّر حفظ القرار." };
  refresh(meetingId);
  return { ok: true, message: resolutionId ? "حُفظ القرار." : "سُجّل القرار." };
}
