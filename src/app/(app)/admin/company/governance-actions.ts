"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/ui/form";
import { APPROVERS, GOVERNANCE_KINDS, LIBRARY_CATEGORY, splitArticles } from "@/lib/articles";
import { requirePage } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/meetings";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type GovernanceInput = {
  id?: string;
  kind: string;
  title: string;
  version: string;
  approvedOn: string;
  approvedBy: string;
  text: string;
  supersedes?: string;
  file?: { storagePath: string; fileName: string; sizeBytes: number; mimeType: string };
};

const MAX_TEXT = 400_000;

/** Adds or edits a bylaws, charter or policy text: its file goes to the library, its text is split into articles. */
export async function saveGovernanceText(input: GovernanceInput): Promise<ActionState> {
  const viewer = await requirePage("/admin/company", LEVELS.edit);
  const title = input.title.trim().slice(0, 200);
  if (!isOneOf(input.kind, GOVERNANCE_KINDS) || !title) return { ok: false, message: "اختر النوع واكتب العنوان." };
  if (input.approvedBy && !isOneOf(input.approvedBy, APPROVERS)) return { ok: false, message: "جهة الاعتماد غير صالحة." };
  if (input.approvedOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.approvedOn)) return { ok: false, message: "تاريخ الاعتماد غير صالح." };
  if (input.text.length > MAX_TEXT) return { ok: false, message: "النص أطول من المسموح؛ قسّمه إلى وثيقتين." };
  const supabase = await createClient();

  let libraryId: string | undefined;
  if (input.file) {
    const f = input.file;
    if (!f.storagePath.startsWith("library/") || f.sizeBytes > MAX_UPLOAD_BYTES) return { ok: false, message: "ملف غير صالح." };
    const { data, error } = await supabase
      .from("library_documents")
      .insert({ storage_path: f.storagePath, file_name: f.fileName.slice(0, 200), title, category: LIBRARY_CATEGORY[input.kind], size_bytes: f.sizeBytes, mime_type: f.mimeType.slice(0, 100), uploaded_by: viewer.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "تعذّر حفظ الملف في المكتبة." };
    libraryId = data.id;
  }

  const row = {
    kind: input.kind,
    title,
    version: input.version.trim().slice(0, 60) || null,
    approved_on: input.approvedOn || null,
    approved_by: input.approvedBy || null,
    source_text: input.text,
    ...(libraryId ? { library_document_id: libraryId } : {}),
  };
  const { data: saved, error } = input.id
    ? await supabase.from("governance_texts").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("governance_texts").insert(row).select("id").single();
  if (error || !saved) return { ok: false, message: "تعذّر الحفظ." };

  const articles = splitArticles(input.text);
  await supabase.from("governance_articles").delete().eq("text_id", saved.id);
  if (articles.length) {
    const { error: artError } = await supabase
      .from("governance_articles")
      .insert(articles.map((a, i) => ({ text_id: saved.id, position: i + 1, number: a.number, heading: a.heading, chapter: a.chapter, body: a.body })));
    if (artError) return { ok: false, message: "حُفظت الوثيقة وتعذّر حفظ موادها؛ أعد الحفظ." };
  }
  if (input.supersedes && input.supersedes !== saved.id) {
    await supabase.from("governance_texts").update({ status: "superseded", superseded_by: saved.id }).eq("id", input.supersedes);
  }
  revalidatePath("/admin/company");
  revalidatePath("/documents");
  return { ok: true, message: articles.length ? `حُفظت الوثيقة في ${articles.length} مادة.` : "حُفظت الوثيقة." };
}

/** Removes a text and its articles (its file stays in the library); the version it replaced becomes current again. */
export async function deleteGovernanceText(id: string) {
  await requirePage("/admin/company", LEVELS.edit);
  const supabase = await createClient();
  await supabase.from("governance_texts").update({ status: "current", superseded_by: null }).eq("superseded_by", id);
  await supabase.from("governance_texts").delete().eq("id", id);
  revalidatePath("/admin/company");
}
