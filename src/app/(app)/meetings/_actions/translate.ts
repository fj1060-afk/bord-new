"use server";

import { requirePage } from "@/lib/auth";
import { serviceSettings } from "@/lib/ai-server";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { translateArabic } from "@/lib/translate";

/** English for an agenda item's Arabic text (organizers only), unless outside translation is turned off. */
export async function toEnglish(texts: string[]): Promise<(string | null)[]> {
  await requirePage("/meetings", LEVELS.edit);
  const texts10 = texts.slice(0, 10);
  if (!(await serviceSettings(await createClient())).external_translation) return texts10.map(() => null);
  return Promise.all(texts10.map(translateArabic));
}
