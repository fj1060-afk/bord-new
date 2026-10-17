import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { groupPeople } from "./people-groups";

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

/** A person for a picker, with the group they are listed under and a short role, e.g. "رئيس المجلس · مستقل". */
export type PersonOption = { id: string; full_name: string; group: string; role: string };

/** Everyone, grouped: board (chair first), committees, management, departments, then others. */
export async function listPeople(supabase: SupabaseClient): Promise<PersonOption[]> {
  const [{ data: people }, { data: board }, { data: committees }, { data: delegates }] = await Promise.all([
    supabase.from("people").select("id, full_name, executive_title, user_id").order("full_name"),
    supabase.from("board_members").select("person_id, position, category, board:boards!inner(status)").eq("status", "active").eq("board.status", "active"),
    supabase.from("committee_members").select("person_id, position, committee:committees!inner(name, status)").eq("status", "active").eq("committee.status", "active"),
    supabase.from("department_delegates").select("user_id, department:departments!inner(name, status)").eq("department.status", "active"),
  ]);
  const boardOf = new Map((board ?? []).map((b) => [b.person_id, { position: b.position, category: b.category }]));
  const committeesOf = new Map<string, { name: string; position: string }[]>();
  for (const c of (committees ?? []) as unknown as { person_id: string; position: string; committee: { name: string } }[])
    committeesOf.set(c.person_id, [...(committeesOf.get(c.person_id) ?? []), { name: c.committee.name, position: c.position }]);
  const deptsOf = new Map<string, string[]>();
  for (const d of (delegates ?? []) as unknown as { user_id: string; department: { name: string } | null }[])
    if (d.department) deptsOf.set(d.user_id, [...(deptsOf.get(d.user_id) ?? []), d.department.name]);
  const groups = groupPeople(
    (people ?? []).map((p) => ({ id: p.id, full_name: p.full_name, executive_title: p.executive_title, board: boardOf.get(p.id), committees: committeesOf.get(p.id), departments: p.user_id ? deptsOf.get(p.user_id) : undefined })),
  );
  return groups.flatMap((g) => g.people.map((p) => ({ ...p, group: g.label })));
}
