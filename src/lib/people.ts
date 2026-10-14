import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

/**
 * Returns the person chosen in a PersonPicker: an existing person's id, or a new
 * person created from the form's new_* fields. RLS decides whether creating is allowed.
 */
export async function resolvePerson(
  supabase: SupabaseClient,
  form: FormData,
): Promise<{ id: string } | { error: string }> {
  const chosen = String(form.get("person_id") ?? "");
  if (chosen && chosen !== "new") return { id: chosen };

  const fullName = text(form, "new_full_name");
  if (!fullName) return { error: "اختر شخصاً أو أدخل اسم الشخص الجديد." };
  const { data, error } = await supabase
    .from("people")
    .insert({ full_name: fullName, email: text(form, "new_email"), phone: text(form, "new_phone") })
    .select("id")
    .single();
  if (error || !data) return { error: "تعذّر إضافة الشخص." };
  return { id: data.id };
}

export type PersonOption = { id: string; full_name: string };

export async function listPeople(supabase: SupabaseClient): Promise<PersonOption[]> {
  const { data } = await supabase.from("people").select("id, full_name").order("full_name");
  return data ?? [];
}
