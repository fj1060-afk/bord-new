"use server";

import { revalidatePath } from "next/cache";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

/** The secretary confirms the pack email went out from Outlook (or withdraws the confirmation). */
export async function markPackEmailed(meetingId: string, sent: boolean) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("meetings").update({ pack_emailed_at: sent ? new Date().toISOString() : null }).eq("id", meetingId);
  revalidatePath(`/meetings/${meetingId}`);
}
