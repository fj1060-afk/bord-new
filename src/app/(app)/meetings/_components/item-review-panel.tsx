"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/styles";
import { reviewDraft, type DraftReview } from "../_actions/item-review";

type Field = "title" | "description";

/** "Check the item" button: spelling suggestions and legal remarks on the unsaved draft. */
export function ItemReviewPanel({ meetingId, form }: { meetingId: string; form: () => HTMLFormElement | null }) {
  const [review, setReview] = useState<DraftReview | null>(null);
  const [pending, start] = useTransition();
  const field = (name: Field) => form()?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  const value = (name: string) => (form()?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";

  const run = () => start(async () => setReview(await reviewDraft(meetingId, { title: value("title"), description: value("description"), kind: value("kind") })));

  const apply = (name: Field, index: number, word: string, fix: string) => {
    const el = field(name);
    if (el) el.value = el.value.replace(word, fix);
    setReview((r) => (r ? { ...r, [name]: r[name].filter((_, i) => i !== index) } : r));
  };

  const spelling = review ? (["title", "description"] as const).flatMap((name) => review[name].map((m, i) => ({ name, i, ...m }))) : [];

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <button type="button" onClick={run} disabled={pending} className={buttonClass("secondary", "w-fit")}>
        {pending ? "جارٍ التدقيق…" : "تدقيق البند (إملائي ونظامي)"}
      </button>
      {review && (
        <div className="flex flex-col gap-3 rounded-lg border border-rule bg-paper p-4 text-sm">
          {spelling.length === 0 && review.findings.length === 0 && <p className="text-primary">لا ملاحظات.</p>}
          {!review.online && <p className="text-xs text-ink-muted">تعذّر الوصول إلى المدقق الإملائي الكامل الآن؛ فُحصت مصطلحات الحوكمة فقط. أعد المحاولة بعد قليل.</p>}
          {spelling.length > 0 && (
            <ul className="flex flex-col gap-2">
              {spelling.map((m) => (
                <li key={`${m.name}-${m.offset}`} className="flex flex-wrap items-center gap-2">
                  <span>
                    خطأ إملائي محتمل: <strong className="text-danger">{m.word}</strong>
                  </span>
                  {m.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => apply(m.name, m.i, m.word, s)} className="rounded-full border border-primary px-2 py-0.5 text-xs text-primary hover:bg-primary-soft">
                      {s}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {review.findings.length > 0 && <ItemFindings findings={review.findings} />}
        </div>
      )}
    </div>
  );
}

export function ItemFindings({ findings }: { findings: DraftReview["findings"] }) {
  return (
    <ul className="flex flex-col gap-2">
      {findings.map((f) => (
        <li key={f.text} className={f.level === "warn" ? "border-s-2 border-brass ps-2" : "border-s-2 border-rule ps-2 text-ink-muted"}>
          {f.text}
          {f.ref && <span className="ms-1 text-xs text-ink-muted">({f.ref})</span>}
        </li>
      ))}
    </ul>
  );
}
