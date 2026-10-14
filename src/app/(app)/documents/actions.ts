"use server";

import { revalidatePath } from "next/cache";
import { requirePage } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/meetings";
import { isOneOf } from "@/lib/org";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { LIBRARY_CATEGORIES } from "@/lib/library";

/** Records a library file the browser already uploaded to private storage. */
export async function registerLibraryDocument(input: {
  storagePath: string;
  fileName: string;
  title: string;
  category: string;
  sizeBytes: number;
  mimeType: string;
}): Promise<{ ok: boolean; message: string }> {
  const viewer = await requirePage("/documents", LEVELS.edit);
  if (!input.storagePath.startsWith("library/") || input.sizeBytes > MAX_UPLOAD_BYTES) return { ok: false, message: "ملف غير صالح." };
  if (!isOneOf(input.category, LIBRARY_CATEGORIES)) return { ok: false, message: "اختر التصنيف." };
  const supabase = await createClient();
  const { error } = await supabase.from("library_documents").insert({
    storage_path: input.storagePath,
    file_name: input.fileName.slice(0, 200),
    title: input.title.trim().slice(0, 200) || input.fileName.slice(0, 200),
    category: input.category,
    size_bytes: input.sizeBytes,
    mime_type: input.mimeType.slice(0, 100),
    uploaded_by: viewer.id,
  });
  if (error) return { ok: false, message: "تعذّر حفظ المستند." };
  revalidatePath("/documents");
  return { ok: true, message: "أُضيف المستند إلى المكتبة." };
}

export async function setArchived(documentId: string, archived: boolean) {
  await requirePage("/documents", LEVELS.edit);
  const supabase = await createClient();
  const { error } = await supabase.from("library_documents").update({ archived }).eq("id", documentId);
  if (error) throw new Error("Could not update document");
  revalidatePath("/documents");
}
