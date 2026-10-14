"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Field, FormMessage, inputClass, type ActionState } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { LIBRARY_CATEGORIES } from "@/lib/library";
import { MAX_UPLOAD_BYTES, storagePath } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/client";
import { registerLibraryDocument } from "./actions";

export function UploadLibraryDocument() {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(form: FormData) {
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) return setState({ ok: false, message: "اختر ملفاً." });
    if (file.size > MAX_UPLOAD_BYTES) return setState({ ok: false, message: "الحد الأقصى لحجم الملف 25 ميجابايت." });
    setBusy(true);
    const path = storagePath("library", file.name, crypto.randomUUID());
    const { error } = await createClient().storage.from("library").upload(path, file, { contentType: file.type });
    const result = error
      ? { ok: false, message: "تعذّر رفع الملف." }
      : await registerLibraryDocument({
          storagePath: path,
          fileName: file.name,
          title: String(form.get("title") ?? ""),
          category: String(form.get("category")),
          sizeBytes: file.size,
          mimeType: file.type,
        });
    setState(result);
    setBusy(false);
    if (result.ok) formRef.current?.reset();
  }

  return (
    <details className="mb-6 rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>
        <Upload size={16} aria-hidden="true" /> إضافة مستند للمكتبة
      </summary>
      <form ref={formRef} action={submit} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-3">
        <Field label="العنوان">
          <input name="title" placeholder="يُستخدم اسم الملف إن تُرك فارغاً" className={inputClass} />
        </Field>
        <Field label="التصنيف">
          <select name="category" defaultValue="policy" className={inputClass}>
            {Object.entries(LIBRARY_CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الملف">
          <input name="file" type="file" required className="text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-3">
          <FormMessage state={state} />
          <button disabled={busy} className={buttonClass("primary", "w-fit")}>
            {busy ? "جارٍ الرفع…" : "رفع المستند"}
          </button>
        </div>
      </form>
    </details>
  );
}
