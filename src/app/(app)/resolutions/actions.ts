"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { getViewer, requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;
const refresh = () => {
  revalidatePath("/resolutions", "layout");
  revalidatePath("/my-tasks");
};

/** Who may manage tasks: organizers or resolution editors (checked again by RLS). */
async function requireManager() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Not signed in");
  return viewer;
}

export async function addTask(resolutionId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requireManager();
  const title = text(form, "title");
  const [kind, id] = String(form.get("assignee") ?? "").split(":");
  if (!title) return { ok: false, message: "عنوان المهمة مطلوب." };
  if (!id || (kind !== "user" && kind !== "department")) return { ok: false, message: "حدد المسؤول عن المهمة." };

  const supabase = await createClient();
  const { error } = await supabase.from("resolution_tasks").insert({
    resolution_id: resolutionId,
    title,
    description: text(form, "description"),
    due_date: text(form, "due_date"),
    assignee_user_id: kind === "user" ? id : null,
    department_id: kind === "department" ? id : null,
  });
  if (error) return { ok: false, message: "تعذّر إضافة المهمة. تأكد من صلاحيتك." };
  refresh();
  return { ok: true, message: "أُضيفت المهمة." };
}

export async function cancelTask(taskId: string) {
  await requirePage("/resolutions", LEVELS.view);
  const supabase = await createClient();
  const { error } = await supabase.from("resolution_tasks").update({ status: "cancelled" }).eq("id", taskId);
  if (error) throw new Error("Could not cancel task");
  refresh();
}

/** Records progress; the evidence file (if any) was already uploaded by the browser. */
export async function reportProgress(input: { taskId: string; status: string; note: string; path: string | null; fileName: string | null }): Promise<{ ok: boolean; message: string }> {
  if (!(await getViewer())) return { ok: false, message: "سجّل الدخول أولاً." };
  if (!input.note.trim() && !input.path) return { ok: false, message: "اكتب ملاحظة أو أرفق دليلاً." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_task_progress", {
    p_task: input.taskId,
    p_status: input.status,
    p_note: input.note,
    p_path: input.path,
    p_file: input.fileName,
  });
  if (error) {
    if (input.path) await supabase.storage.from("task-evidence").remove([input.path]);
    return { ok: false, message: "تعذّر حفظ التحديث." };
  }
  refresh();
  return { ok: true, message: input.status === "done" ? "سُجّلت المهمة منجزة." : "حُفظ التحديث." };
}
