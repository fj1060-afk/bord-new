"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { FormMessage, inputClass, type ActionState } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { MAX_UPLOAD_BYTES, storagePath } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/client";
import { registerDocument } from "../_actions/documents";

/** Uploads straight from the browser to private storage, then records the document. */
export function UploadDocument({
  meetingId,
  agendaItemId = null,
  documentRequestId = null,
  label = "رفع مستند",
}: {
  meetingId: string;
  agendaItemId?: string | null;
  documentRequestId?: string | null;
  label?: string;
}) {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setState({ ok: false, message: "اختر ملفاً." });
    if (file.size > MAX_UPLOAD_BYTES) return setState({ ok: false, message: "الحد الأقصى لحجم الملف 25 ميجابايت." });
    setBusy(true);
    setState(null);
    const path = storagePath(meetingId, file.name, crypto.randomUUID());
    const { error } = await createClient().storage.from("meeting-documents").upload(path, file, { contentType: file.type });
    const result = error
      ? { ok: false, message: "تعذّر رفع الملف. تأكد من صلاحيتك وأعد المحاولة." }
      : await registerDocument({
          meetingId,
          storagePath: path,
          fileName: file.name,
          title: titleRef.current?.value ?? "",
          sizeBytes: file.size,
          mimeType: file.type,
          agendaItemId,
          documentRequestId,
        });
    setState(result);
    setBusy(false);
    if (result.ok && fileRef.current && titleRef.current) {
      fileRef.current.value = "";
      titleRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input ref={titleRef} placeholder="عنوان المستند (اختياري)" className={`${inputClass} min-w-0 flex-1`} />
        <input ref={fileRef} type="file" aria-label="الملف" className="min-w-0 flex-1 text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
        <button type="button" onClick={upload} disabled={busy} className={buttonClass("secondary")}>
          <Upload size={16} aria-hidden="true" />
          {busy ? "جارٍ الرفع…" : label}
        </button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
