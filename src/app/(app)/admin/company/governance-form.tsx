"use client";

import { useMemo, useState } from "react";
import { Field, FormMessage, inputClass, type ActionState } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { APPROVERS, GOVERNANCE_KINDS, splitArticles } from "@/lib/articles";
import { MAX_UPLOAD_BYTES, storagePath } from "@/lib/meetings";
import { createClient } from "@/lib/supabase/client";
import { saveGovernanceText } from "./governance-actions";

export type GovernanceText = {
  id: string;
  kind: keyof typeof GOVERNANCE_KINDS;
  title: string;
  version: string | null;
  approved_on: string | null;
  approved_by: keyof typeof APPROVERS | null;
  library_document_id: string | null;
  status: "current" | "superseded";
  source_text: string;
};

/** Adds a text (or edits `text`): metadata, an optional file for the library, and the pasted text split into articles. */
export function GovernanceForm({ text, current, onDone }: { text?: GovernanceText; current: GovernanceText[]; onDone?: () => void }) {
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const [body, setBody] = useState(text?.source_text ?? "");
  const articles = useMemo(() => splitArticles(body), [body]);
  const numbered = articles.filter((a) => a.number !== "تمهيد");

  async function submit(form: FormData) {
    setBusy(true);
    const file = form.get("file") as File | null;
    let uploaded;
    if (file && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setBusy(false);
        return setState({ ok: false, message: "الحد الأقصى لحجم الملف 25 ميجابايت." });
      }
      const path = storagePath("library", file.name, crypto.randomUUID());
      const { error } = await createClient().storage.from("library").upload(path, file, { contentType: file.type });
      if (error) {
        setBusy(false);
        return setState({ ok: false, message: "تعذّر رفع الملف." });
      }
      uploaded = { storagePath: path, fileName: file.name, sizeBytes: file.size, mimeType: file.type };
    }
    const result = await saveGovernanceText({
      id: text?.id,
      kind: String(form.get("kind")),
      title: String(form.get("title") ?? ""),
      version: String(form.get("version") ?? ""),
      approvedOn: String(form.get("approved_on") ?? ""),
      approvedBy: String(form.get("approved_by") ?? ""),
      supersedes: String(form.get("supersedes") ?? "") || undefined,
      text: body,
      file: uploaded,
    });
    setState(result);
    setBusy(false);
    if (result?.ok) {
      if (!text) setBody("");
      onDone?.();
    }
  }

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="النوع">
        <select name="kind" defaultValue={text?.kind ?? "bylaws"} className={inputClass}>
          {Object.entries(GOVERNANCE_KINDS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="العنوان">
        <input name="title" required defaultValue={text?.title} placeholder="النظام الأساس لشركة …" spellCheck lang="ar" className={inputClass} />
      </Field>
      <Field label="الإصدار" hint="مثل: الإصدار الثالث، أو تعديل 2026">
        <input name="version" defaultValue={text?.version ?? ""} className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="تاريخ الاعتماد">
          <input name="approved_on" type="date" defaultValue={text?.approved_on ?? ""} className={inputClass} />
        </Field>
        <Field label="جهة الاعتماد">
          <select name="approved_by" defaultValue={text?.approved_by ?? ""} className={inputClass}>
            <option value="">—</option>
            {Object.entries(APPROVERS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={text?.library_document_id ? "استبدال الملف (اختياري)" : "الملف المعتمد (اختياري)"} hint="يُحفظ في مكتبة المستندات، وتسري عليه حماية المستندات.">
        <input name="file" type="file" accept=".pdf,.doc,.docx" className="text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-primary" />
      </Field>
      {!text && current.length > 0 && (
        <Field label="يحل محل إصدار سابق؟">
          <select name="supersedes" defaultValue="" className={inputClass}>
            <option value="">لا، وثيقة جديدة</option>
            {current.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.version ? ` (${t.version})` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="gov-text" className="text-sm font-medium">
          نص الوثيقة
        </label>
        <textarea
          id="gov-text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          spellCheck
          lang="ar"
          placeholder={"الصق النص هنا. تُقسم المواد تلقائياً عند كل سطر يبدأ بـ «المادة (1)» أو «المادة الأولى»، ويُحفظ «الباب» و«الفصل» عنواناً لما بعده."}
          className={inputClass}
        />
        {body.trim() && (
          <p className="text-xs text-ink-muted" aria-live="polite">
            {numbered.length
              ? `سيُقسم إلى ${numbered.length} مادة (من ${numbered[0].number} إلى ${numbered[numbered.length - 1].number})${articles.length > numbered.length ? " مع تمهيد" : ""}.`
              : "لم تُعرف مواد مرقمة؛ سيُحفظ النص كتلة واحدة."}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FormMessage state={state} />
        <button disabled={busy} className={buttonClass("primary", "w-fit")}>
          {busy ? "جارٍ الحفظ…" : text ? "حفظ التعديلات" : "إضافة الوثيقة"}
        </button>
      </div>
    </form>
  );
}
