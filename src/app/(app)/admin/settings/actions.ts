"use server";

import { revalidatePath } from "next/cache";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function endSession(sessionId: string) {
  await requirePage("/admin/settings", LEVELS.manage);
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_session", { p_session: sessionId });
  if (error) throw new Error("Could not end session");
  revalidatePath("/admin/settings");
}
