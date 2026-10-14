"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { meetingQuorum } from "@/lib/live-server";
import { loadMinutesGaps } from "./minutes-check";
import { meetingReference, riyadhParts } from "@/lib/meetings";
import { defaultIntro } from "@/lib/minutes";
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
    .select("number, starts_at, location, live_status, board:boards(name), committee:committees(name)")
    .eq("id", meetingId)
    .single();
  if (!meeting || meeting.live_status !== "ended") return { ok: false, message: "يُعد المحضر بعد انتهاء الاجتماع." };

  const q = await meetingQuorum(supabase, meetingId);
  const body = (meeting.board ?? meeting.committee) as unknown as { name: string } | null;
  const when = riyadhParts(meeting.starts_at);
  const { data: minutes, error } = await supabase
    .from("minutes")
    .insert({
      meeting_id: meetingId,
      intro: defaultIntro({
        body: body?.name ?? "المجلس",
        reference: meetingReference(meeting.number, meeting.starts_at),
        date: formatGregorianDate(new Date(meeting.starts_at)),
        time: when.time,
        location: meeting.location,
        attendees: q.counted,
        members: q.members,
      }),
      closing: "وانتهى الاجتماع بعد استكمال مناقشة بنود جدول الأعمال.",
    })
    .select("id")
    .single();
  if (error || !minutes) return { ok: false, message: "تعذّر إنشاء المحضر." };

  const { data: items } = await supabase.from("agenda_items").select("id, outcome").eq("meeting_id", meetingId);
  if (items?.length) {
    await supabase.from("minutes_items").insert(items.map((i) => ({ minutes_id: minutes.id, agenda_item_id: i.id, deliberation: i.outcome })));
  }
  refresh(meetingId);
  return { ok: true, message: "أُنشئ المحضر." };
}

export async function saveMinutes(meetingId: string, minutesId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("minutes").update({ intro: text(form, "intro"), closing: text(form, "closing"), intro_en: text(form, "intro_en"), closing_en: text(form, "closing_en") }).eq("id", minutesId).eq("status", "draft");
  if (error) return { ok: false, message: "تعذّر حفظ المحضر." };
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("item:")) continue;
    const itemId = key.slice(5);
    await supabase.from("minutes_items").upsert({
      minutes_id: minutesId,
      agenda_item_id: itemId,
      deliberation: String(value).trim() || null,
      deliberation_en: String(form.get(`item_en:${itemId}`) ?? "").trim() || null,
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
