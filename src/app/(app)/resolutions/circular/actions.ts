"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { circularOutcome, VOTES } from "@/lib/secretary";
import { isOneOf } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const PATH = "/resolutions/circular";

export async function createCircular(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/resolutions", LEVELS.edit);
  const [kind, id] = String(fd.get("body") ?? "").split(":");
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  const text = String(fd.get("text") ?? "").trim().slice(0, 10000);
  const deadline = String(fd.get("deadline") ?? "");
  if (!id || !title || !text) return { ok: false, message: "الجهة والعنوان ونص القرار مطلوبة." };
  const supabase = await createClient();
  const { error } = await supabase.from("circular_resolutions").insert({
    [kind === "board" ? "board_id" : "committee_id"]: id,
    title,
    text,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
  });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(PATH);
  return { ok: true, message: "طُرح القرار للتصويت." };
}

export async function castVote(circularId: string, vote: string) {
  if (!isOneOf(vote, VOTES)) throw new Error("Bad vote");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cast_circular_vote", { p_circular: circularId, p_vote: vote });
  if (error) throw new Error("Could not vote");
  revalidatePath(PATH);
}

/** Closes voting: passed with an absolute majority of the voting members, otherwise not passed. */
export async function closeCircular(circularId: string, withdraw = false) {
  await requirePage("/resolutions", LEVELS.edit);
  const supabase = await createClient();
  let status = "withdrawn";
  if (!withdraw) {
    const [{ data: voters }, { data: votes }] = await Promise.all([
      supabase.rpc("circular_voters", { p_circular: circularId }),
      supabase.from("circular_votes").select("vote").eq("circular_id", circularId),
    ]);
    status = circularOutcome((voters ?? []).length, votes ?? []).outcome === "passed" ? "passed" : "rejected";
  }
  const { error } = await supabase.from("circular_resolutions").update({ status, closed_at: new Date().toISOString() }).eq("id", circularId).eq("status", "open");
  if (error) throw new Error("Could not close");
  revalidatePath(PATH);
}

/** Records the meeting at which a passed circular resolution was entered in the minutes (art. 82). */
export async function ratifyCircular(circularId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/resolutions", LEVELS.edit);
  const meetingId = String(fd.get("meeting_id") ?? "");
  if (!meetingId) return { ok: false, message: "اختر الاجتماع." };
  const supabase = await createClient();
  const { error } = await supabase.from("circular_resolutions").update({ ratified_meeting_id: meetingId }).eq("id", circularId);
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(PATH);
  return { ok: true, message: "سُجّل إثبات القرار." };
}
