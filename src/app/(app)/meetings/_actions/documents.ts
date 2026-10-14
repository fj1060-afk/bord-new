"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a file the browser already uploaded to storage. Storage and table RLS
 * both decide whether this user may add documents to the meeting.
 */
export async function registerDocument(input: {
  meetingId: string;
  storagePath: string;
  fileName: string;
  title: string;
  sizeBytes: number;
  mimeType: string;
  agendaItemId: string | null;
  documentRequestId: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "سجّل الدخول أولاً." };
  if (!input.storagePath.startsWith(`${input.meetingId}/`) || input.sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "ملف غير صالح." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_documents").insert({
    meeting_id: input.meetingId,
    storage_path: input.storagePath,
    file_name: input.fileName.slice(0, 200),
    title: input.title.trim().slice(0, 200) || input.fileName.slice(0, 200),
    size_bytes: input.sizeBytes,
    mime_type: input.mimeType.slice(0, 100),
    agenda_item_id: input.agendaItemId,
    document_request_id: input.documentRequestId,
    uploaded_by: viewer.id,
  });
  if (error) {
    await supabase.storage.from("meeting-documents").remove([input.storagePath]);
    return { ok: false, message: "تعذّر حفظ المستند." };
  }
  revalidatePath(`/meetings/${input.meetingId}`);
  revalidatePath("/meetings");
  return { ok: true, message: "رُفع المستند." };
}
