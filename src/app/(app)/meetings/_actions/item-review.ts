"use server";

import { requirePage } from "@/lib/auth";
import { reviewItem, type Finding } from "@/lib/item-review";
import { meetingDisclosures } from "@/lib/item-review-server";
import { currentYear } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { checkSpelling, type Misspelling } from "@/lib/spelling";
import { createClient } from "@/lib/supabase/server";

export type DraftReview = { title: Misspelling[]; description: Misspelling[]; findings: Finding[]; online: boolean };

/** Spelling and legal review of an agenda item before it is saved. */
export async function reviewDraft(meetingId: string, draft: { title: string; description: string; kind: string }, online = true): Promise<DraftReview> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  // One request for both fields: the title, a line break, then the description.
  const [spelling, disclosures] = await Promise.all([checkSpelling(`${draft.title}\n${draft.description}`, online), meetingDisclosures(supabase, meetingId)]);
  const cut = draft.title.length + 1;
  return {
    title: spelling.matches.filter((m) => m.offset < cut),
    description: spelling.matches.filter((m) => m.offset >= cut).map((m) => ({ ...m, offset: m.offset - cut })),
    findings: reviewItem(draft, disclosures, currentYear() - 1),
    online: spelling.online,
  };
}
