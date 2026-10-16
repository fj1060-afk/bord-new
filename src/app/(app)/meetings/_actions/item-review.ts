"use server";

import { requirePage } from "@/lib/auth";
import { reviewItem, type Finding } from "@/lib/item-review";
import { meetingAffiliations, meetingDisclosures } from "@/lib/item-review-server";
import { currentYear } from "@/lib/org";
import { companyProfile } from "@/lib/live-server";
import { loadPowers } from "@/lib/authority-server";
import { serviceSettings } from "@/lib/ai-server";
import { libraryTemplates, matchTemplate } from "@/lib/item-templates";
import { LEVELS } from "@/lib/permissions";
import { checkSpelling, type Misspelling } from "@/lib/spelling";
import { createClient } from "@/lib/supabase/server";

export type DraftReview = { title: Misspelling[]; description: Misspelling[]; findings: Finding[]; online: boolean; spellingOff?: boolean };

/** Spelling and legal review of an agenda item before it is saved. */
export async function reviewDraft(meetingId: string, draft: { title: string; description: string; kind: string }, online = true): Promise<DraftReview> {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const { external_spelling } = await serviceSettings(supabase);
  // One request for both fields: the title, a line break, then the description.
  const [spelling, disclosures, profile, powers, { data: own }, affiliations] = await Promise.all([
    checkSpelling(`${draft.title}\n${draft.description}`, online && external_spelling),
    meetingDisclosures(supabase, meetingId),
    companyProfile(supabase),
    loadPowers(supabase),
    supabase.from("agenda_item_library").select("title, title_en, body, kind, category, needs"),
    meetingAffiliations(supabase, meetingId),
  ]);
  const template = matchTemplate(draft.title, libraryTemplates(own ?? []));
  const cut = draft.title.length + 1;
  return {
    title: spelling.matches.filter((m) => m.offset < cut),
    description: spelling.matches.filter((m) => m.offset >= cut).map((m) => ({ ...m, offset: m.offset - cut })),
    findings: reviewItem(draft, { disclosures, year: currentYear() - 1, listed: profile?.company_type === "listed_jsc", template, powers, affiliations, company: profile?.name ?? "" }),
    online: spelling.online,
    spellingOff: !external_spelling,
  };
}
