"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { BOARD_CATEGORIES, BOARD_POSITIONS, COMMITTEE_POSITIONS, isOneOf, membershipError } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
const fail = (message: string): ActionState => ({ ok: false, message });
// Positions held by one person at a time in each body.
const SINGLE = new Set(["chair", "vice_chair", "secretary"]);

/** The user's person record, created from the profile when missing. */
async function personOf(supabase: Client, userId: string): Promise<string | null> {
  const { data: person } = await supabase.from("people").select("id").eq("user_id", userId).maybeSingle();
  if (person) return person.id;
  const { data: profile } = await supabase.from("profiles").select("full_name, email, phone, job_title").eq("id", userId).maybeSingle();
  if (!profile) return null;
  const { data: created } = await supabase.from("people").insert({ full_name: profile.full_name, email: profile.email, phone: profile.phone, user_id: userId }).select("id").single();
  return created?.id ?? null;
}

/**
 * Sets one seat (board or committee): adds it, changes its position, or ends it
 * (kept in the history) when the position is cleared. A chair, vice chair or
 * secretary must not already be someone else's.
 */
async function setSeat(supabase: Client, table: "board_members" | "committee_members", body: { column: "board_id" | "committee_id"; id: string; name: string }, personId: string, position: string, extra: Record<string, string>): Promise<string | null> {
  const { data: seats } = await supabase.from(table).select("id, person_id, position, person:people(full_name)").eq(body.column, body.id).eq("status", "active");
  const rows = (seats ?? []) as unknown as { id: string; person_id: string; position: string; person: { full_name: string } | null }[];
  const mine = rows.find((s) => s.person_id === personId);
  if (position && SINGLE.has(position)) {
    const holder = rows.find((s) => s.person_id !== personId && s.position === position);
    if (holder) return `${holder.person?.full_name ?? "عضو آخر"} يشغل هذا المنصب في ${body.name}؛ غيّر منصبه أولاً من صفحته.`;
  }
  if (!position) {
    if (!mine) return null;
    const { error } = await supabase.from(table).update({ status: "ended", end_date: riyadhToday() }).eq("id", mine.id);
    return error ? `تعذّر إنهاء العضوية في ${body.name}.` : null;
  }
  const { error } = mine
    ? await supabase.from(table).update({ position, ...extra }).eq("id", mine.id)
    : await supabase.from(table).insert({ [body.column]: body.id, person_id: personId, position, ...extra });
  return error ? membershipError(error.code, error.message) : null;
}

/**
 * The user's governance positions, set only here: their seat on the board
 * (chair, vice chair or member, with the category) and in each committee.
 * Holding a seat also grants the matching access role.
 */
export async function updatePositions(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/admin/users", LEVELS.manage);
  const supabase = await createClient();
  const personId = await personOf(supabase, userId);
  if (!personId) return fail("تعذّر العثور على سجل الشخص.");

  const problems: string[] = [];
  const roles = new Set<string>();
  const { data: board } = await supabase.from("boards").select("id, name").eq("status", "active").limit(1).maybeSingle();
  if (board) {
    const position = String(form.get("board_position") ?? "");
    const category = String(form.get("board_category") ?? "non_executive");
    if (position && (!isOneOf(position, BOARD_POSITIONS) || !isOneOf(category, BOARD_CATEGORIES))) return fail("اختر المنصب والصفة في المجلس.");
    const problem = await setSeat(supabase, "board_members", { column: "board_id", id: board.id, name: "المجلس" }, personId, position, position ? { category } : {});
    if (problem) problems.push(problem);
    else if (position) roles.add("board_member");
  }
  const { data: committees } = await supabase.from("committees").select("id, name").eq("status", "active");
  for (const c of committees ?? []) {
    const position = String(form.get(`committee:${c.id}`) ?? "");
    if (position && !isOneOf(position, COMMITTEE_POSITIONS)) return fail("منصب اللجنة غير صالح.");
    const problem = await setSeat(supabase, "committee_members", { column: "committee_id", id: c.id, name: c.name }, personId, position, {});
    if (problem) problems.push(problem);
    else if (position) roles.add("committee_member");
  }

  // A seat brings its access role (added only; removing a seat leaves roles to the admin).
  if (roles.size) {
    const { data: wanted } = await supabase.from("roles").select("id").in("key", [...roles]);
    const { data: held } = await supabase.from("user_roles").select("role_id").eq("user_id", userId);
    const missing = (wanted ?? []).filter((r) => !(held ?? []).some((h) => h.role_id === r.id));
    if (missing.length) await supabase.from("user_roles").insert(missing.map((r) => ({ user_id: userId, role_id: r.id })));
  }

  revalidatePath("/", "layout");
  return problems.length ? fail(problems.join(" ")) : { ok: true, message: "حُفظت المناصب." };
}
