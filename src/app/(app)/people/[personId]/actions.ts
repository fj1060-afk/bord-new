"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer } from "@/lib/auth";
import { POSITION_ROLES } from "@/lib/affiliations";
import { currentYear, isOneOf } from "@/lib/org";
import { LEVELS, can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Not signed in");
  return viewer;
}

export async function savePerson(personId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  if (!can(viewer.permissions, "/board", LEVELS.edit) && !can(viewer.permissions, "/committees", LEVELS.edit)) {
    return { ok: false, message: "لا تملك صلاحية التعديل." };
  }
  const fullName = text(form, "full_name");
  if (!fullName) return { ok: false, message: "الاسم مطلوب." };

  const update: Record<string, string | null> = {
    full_name: fullName,
    full_name_en: text(form, "full_name_en"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    job_title: text(form, "job_title"),
    organization: text(form, "organization"),
    qualifications: text(form, "qualifications"),
    experience: text(form, "experience"),
  };
  // Identity details are written here but read only through person_private().
  for (const key of ["national_id", "nationality", "address"]) if (form.has(key)) update[key] = text(form, key)?.slice(0, 300) ?? null;
  if (form.has("user_id")) update.user_id = text(form, "user_id");

  const supabase = await createClient();
  const { error } = await supabase.from("people").update(update).eq("id", personId);
  if (error) {
    return { ok: false, message: error.code === "23505" ? "حساب الدخول هذا مرتبط بشخص آخر." : "تعذّر الحفظ." };
  }
  revalidatePath(`/people/${personId}`);
  return { ok: true, message: "حُفظت البيانات." };
}

export async function fileDisclosure(personId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireViewer();
  const hasConflict = form.get("has_conflict") === "yes";
  const details = text(form, "details");
  if (hasConflict && !details) return { ok: false, message: "اذكر تفاصيل تعارض المصالح." };

  // RLS allows the person themself, or board editors on their behalf.
  const supabase = await createClient();
  const { error } = await supabase
    .from("disclosures")
    .insert({ person_id: personId, year: currentYear(), has_conflict: hasConflict, details });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "قُدّم إفصاح هذا العام من قبل." : "تعذّر حفظ الإفصاح." };
  }
  revalidatePath(`/people/${personId}`);
  return { ok: true, message: "قُدّم الإفصاح." };
}

export async function reviewDisclosure(personId: string, disclosureId: string) {
  const viewer = await requireViewer();
  if (!can(viewer.permissions, "/board", LEVELS.edit)) throw new Error("Not allowed");
  const supabase = await createClient();
  const { error } = await supabase
    .from("disclosures")
    .update({ status: "reviewed", reviewed_by: viewer.id })
    .eq("id", disclosureId);
  if (error) throw new Error("Could not review disclosure");
  revalidatePath(`/people/${personId}`);
}

const year = (form: FormData, key: string) => {
  const n = Number(form.get(key));
  return Number.isInteger(n) && n >= 1950 && n <= 2100 ? n : null;
};

/** Adds a position to a member's CV (the member, or member editors; RLS decides). */
export async function addPosition(personId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireViewer();
  const organization = text(form, "organization");
  const role = String(form.get("role") ?? "");
  if (!organization || !isOneOf(role, POSITION_ROLES)) return { ok: false, message: "اكتب اسم الجهة واختر الصفة." };
  const start = year(form, "start_year");
  const end = form.get("current") === "on" ? null : year(form, "end_year");
  if (start && end && end < start) return { ok: false, message: "سنة الانتهاء قبل سنة البداية." };
  const supabase = await createClient();
  const { error } = await supabase.from("person_positions").insert({
    person_id: personId,
    organization: organization.slice(0, 200),
    role,
    title: text(form, "title")?.slice(0, 120) ?? null,
    listed: form.get("listed") === "on",
    start_year: start,
    end_year: end,
  });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath(`/people/${personId}`);
  return { ok: true, message: "أُضيف إلى السيرة الذاتية." };
}

export async function removePosition(personId: string, positionId: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("person_positions").delete().eq("id", positionId);
  revalidatePath(`/people/${personId}`);
}
