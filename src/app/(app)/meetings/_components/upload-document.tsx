"use client";

import { useRef, useState } from "react";
import { Upload, UploadCloud, X } from "lucide-react";
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
  const [picked, setPicked] = useState<File | null>(null);
  const [over, setOver] = useState(false);

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
      setPicked(null);
    }
  }

  const size = picked ? (picked.size < 1048576 ? `${Math.max(1, Math.round(picked.size / 1024))} ك.ب` : `${(picked.size / 1048576).toFixed(1)} م.ب`) : "";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-rule p-3">
      {/* Click to pick a file, or drop one here. */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (!file || !fileRef.current) return;
          const list = new DataTransfer();
          list.items.add(file);
          fileRef.current.files = list.files;
          setPicked(file);
        }}
        className={`motion-colors flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-primary-soft ${over ? "bg-primary-soft" : "bg-paper"}`}
      >
        <UploadCloud size={18} aria-hidden="true" className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          {picked ? (
            <>
              <span className="block truncate" dir="auto">{picked.name}</span>
              <span className="block font-mono text-[11px] text-ink-muted">{size}</span>
            </>
          ) : (
            <span className="text-ink-muted">اسحب الملف هنا أو اضغط للاختيار (حتى 25 م.ب)</span>
          )}
        </span>
        {picked && (
          <button
            type="button"
            aria-label="إزالة الملف"
            onClick={(e) => {
              e.preventDefault();
              if (fileRef.current) fileRef.current.value = "";
              setPicked(null);
            }}
            className="rounded p-1 text-ink-muted hover:bg-surface"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <input ref={fileRef} type="file" className="sr-only" onChange={(e) => setPicked(e.target.files?.[0] ?? null)} />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={titleRef} placeholder="عنوان المستند (اختياري)" className={`${inputClass} min-w-0 flex-1`} />
        <button type="button" onClick={upload} disabled={busy || !picked} className={buttonClass("secondary", "min-h-11 shrink-0")}>
          <Upload size={16} aria-hidden="true" />
          {busy ? "جارٍ الرفع…" : label}
        </button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
