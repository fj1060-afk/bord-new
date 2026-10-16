"use server";

import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { translateArabic } from "@/lib/translate";

/** English for an agenda item's Arabic text (organizers only). */
export async function toEnglish(texts: string[]): Promise<(string | null)[]> {
  await requirePage("/meetings", LEVELS.edit);
  return Promise.all(texts.slice(0, 10).map(translateArabic));
}
