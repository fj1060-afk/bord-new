"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { wantedRequirements } from "@/lib/requirements-server";
import { unassigned, type ReqRow } from "@/lib/requirements";
import { createClient } from "@/lib/supabase/server";

const done = (meetingId: string) => revalidatePath(`/meetings/${meetingId}`);

/** "department:<id>" or "user:<id>" from a target select. */
function targetColumns(value: string) {
  const [kind, id] = value.split(":");
  return { department_id: kind === "department" && id ? id : null, assignee_user_id: kind === "user" && id ? id : null };
}

export async function setRequirementStatus(meetingId: string, id: string, status: "draft" | "dismissed") {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("agenda_item_requirements").update({ status }).eq("id", id).neq("status", "sent");
  done(meetingId);
}

/** Changes who a draft is requested from and by when. */
export async function setRequirementTarget(meetingId: string, id: string, target: string, dueDate: string | null) {
  await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("agenda_item_requirements").update({ ...targetColumns(target), due_date: dueDate || null }).eq("id", id).eq("status", "draft");
  done(meetingId);
}

/** The secretary confirms (or withdraws confirmation of) a check, with an optional note. */
export async function confirmCheck(meetingId: string, id: string, confirmed: boolean, note: string | null) {
  const viewer = await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  await supabase
    .from("agenda_item_requirements")
    .update(confirmed ? { checked_by: viewer.id, checked_at: new Date().toISOString(), note: note?.trim() || null } : { checked_by: null, checked_at: null })
    .eq("id", id)
    .eq("kind", "check");
  done(meetingId);
}

/** A requirement added by hand to one item. */
export async function addRequirement(meetingId: string, itemId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePage("/meetings", LEVELS.edit);
  const label = String(form.get("label") ?? "").trim();
  const kind = String(form.get("kind") ?? "doc");
  if (!label || !["doc", "rec", "check"].includes(kind)) return { ok: false, message: "اكتب المتطلب ونوعه." };
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_item_requirements").insert({
    agenda_item_id: itemId,
    meeting_id: meetingId,
    position: 100,
    kind,
    label,
    custom: true,
    due_date: kind === "check" ? null : String(form.get("due_date") ?? "") || null,
    ...targetColumns(String(form.get("target") ?? "")),
  });
  if (error) return { ok: false, message: error.code === "23505" ? "هذا المتطلب موجود في البند." : "تعذّرت الإضافة." };
  done(meetingId);
  return { ok: true, message: "أُضيف المتطلب (مسودة)." };
}

/**
 * Sends the meeting's drafted requirements: documents and recommendations
 * become document requests (each person sees theirs together under "مهامي"),
 * checks become active; requirements no longer needed are withdrawn when
 * nothing was delivered for them yet.
 */
export async function sendRequirements(meetingId: string): Promise<ActionState> {
  const viewer = await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const [{ data: rows }, { data: items }] = await Promise.all([
    supabase
      .from("agenda_item_requirements")
      .select("id, agenda_item_id, label, kind, custom, status, source, department_id, assignee_user_id, due_date, document_request_id, request:document_requests(status)")
      .eq("meeting_id", meetingId),
    supabase.from("agenda_items").select("id, title").eq("meeting_id", meetingId),
  ]);
  type Row = ReqRow & { agenda_item_id: string; source: string | null; due_date: string | null; document_request_id: string | null; request: { status: string } | null };
  const all = (rows ?? []) as unknown as Row[];
  // Documents the secretary prepares are assigned to whoever sends.
  for (const r of all) if (r.status === "draft" && r.kind === "doc" && r.source === "secretary" && !r.department_id && !r.assignee_user_id) r.assignee_user_id = viewer.id;
  const missing = unassigned(all);
  if (missing.length) return { ok: false, message: `حدّد المطلوب منه قبل الإرسال: ${missing.map((r) => r.label).join("، ")}` };

  for (const r of all.filter((r) => r.status === "draft")) {
    let requestId: string | null = null;
    if (r.kind !== "check") {
      const { data, error } = await supabase
        .from("document_requests")
        .insert({ agenda_item_id: r.agenda_item_id, department_id: r.department_id, assignee_user_id: r.assignee_user_id, title: r.label, due_date: r.due_date })
        .select("id")
        .single();
      if (error || !data) return { ok: false, message: `تعذّر إرسال: ${r.label}` };
      requestId = data.id;
    }
    await supabase.from("agenda_item_requirements").update({ status: "sent", document_request_id: requestId, assignee_user_id: r.assignee_user_id }).eq("id", r.id);
  }

  // Withdraw sent requirements an item no longer calls for, if nothing was delivered.
  for (const item of items ?? []) {
    const wanted = new Set((await wantedRequirements(supabase, item.title)).map((r) => r.ar));
    for (const r of all.filter((r) => r.agenda_item_id === item.id && r.status === "sent" && !r.custom && !wanted.has(r.label))) {
      if (r.request && r.request.status !== "requested") continue;
      if (r.document_request_id) await supabase.from("document_requests").delete().eq("id", r.document_request_id);
      await supabase.from("agenda_item_requirements").delete().eq("id", r.id);
    }
  }

  await supabase.from("meetings").update({ requirements_sent_at: new Date().toISOString() }).eq("id", meetingId);
  done(meetingId);
  return { ok: true, message: "أُرسلت طلبات المتطلبات." };
}
