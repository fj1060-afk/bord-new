"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { riyadhToday } from "@/lib/minutes";
import { INCOMING_STATUS, OUTGOING_STATUS } from "@/lib/offices";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max) || null;
const date = (fd: FormData, key: string) => (/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get(key))) ? String(fd.get(key)) : null);

/** Creates (id null) or edits a letter; new incoming mail starts as "new", outgoing as a draft. */
export async function saveCorrespondence(id: string | null, direction: "incoming" | "outgoing", _: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/director-office", LEVELS.edit);
  const subject = text(fd, "subject");
  if (!subject) return { ok: false, message: "اكتب الموضوع." };
  const row = {
    subject,
    body: text(fd, "body", 20000),
    reference: text(fd, "reference", 100),
    contact_id: text(fd, "contact_id", 40),
    dated_on: date(fd, "dated_on"),
    due_date: date(fd, "due_date"),
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("correspondence").update(row).eq("id", id)
    : await supabase.from("correspondence").insert({ ...row, direction, status: direction === "incoming" ? "new" : "draft" });
  if (error) return { ok: false, message: "تعذّر الحفظ." };
  revalidatePath("/director-office");
  return { ok: true, message: id ? "حُفظت التعديلات." : direction === "incoming" ? "سُجّل الوارد." : "حُفظت المسودة." };
}

export async function setCorrespondenceStatus(id: string, status: string) {
  await requirePage("/director-office", LEVELS.edit);
  if (!(status in INCOMING_STATUS) && !(status in OUTGOING_STATUS)) throw new Error("Bad status");
  const supabase = await createClient();
  const patch: { status: string; dated_on?: string } = { status };
  if (status === "sent") patch.dated_on = riyadhToday();
  const { error } = await supabase.from("correspondence").update(patch).eq("id", id);
  if (error) throw new Error("Could not update correspondence");
  revalidatePath("/director-office");
}

export async function deleteDraft(id: string) {
  await requirePage("/director-office", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("correspondence").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error("Could not delete draft");
  revalidatePath("/director-office");
}

export async function saveContact(_: ActionState, fd: FormData): Promise<ActionState> {
  await requirePage("/director-office", LEVELS.edit);
  const name = text(fd, "name");
  if (!name) return { ok: false, message: "اكتب الاسم." };
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    name,
    organization: text(fd, "organization"),
    title: text(fd, "title"),
    email: text(fd, "email"),
    phone: text(fd, "phone", 40),
    notes: text(fd, "notes", 2000),
  });
  if (error) return { ok: false, message: "تعذّر حفظ جهة الاتصال." };
  revalidatePath("/director-office");
  return { ok: true, message: "أُضيفت جهة الاتصال." };
}

export async function deleteContact(id: string) {
  await requirePage("/director-office", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error("Could not delete contact");
  revalidatePath("/director-office");
}
