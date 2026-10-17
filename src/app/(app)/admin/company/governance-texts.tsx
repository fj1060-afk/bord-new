"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { inputWith } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { APPROVERS, GOVERNANCE_KINDS } from "@/lib/articles";
import { fold } from "@/lib/item-review";
import { deleteGovernanceText } from "./governance-actions";
import { GovernanceForm, type GovernanceText } from "./governance-form";

export type ArticleRow = { text_id: string; position: number; number: string; heading: string | null; chapter: string | null; body: string };

const label = (a: ArticleRow) => (a.number === "تمهيد" ? "تمهيد" : `المادة ${a.number}`);

function Articles({ rows }: { rows: ArticleRow[] }) {
  return (
    <ol className="flex flex-col gap-3 text-sm leading-7">
      {rows.map((a, i) => (
        <li key={a.position}>
          {a.chapter && a.chapter !== rows[i - 1]?.chapter && <p className="mb-1 mt-2 font-display font-bold text-brass">{a.chapter}</p>}
          <p className="font-medium">
            {label(a)}
            {a.heading ? `: ${a.heading}` : ""}
          </p>
          <p className="whitespace-pre-line text-ink-muted">{a.body}</p>
        </li>
      ))}
    </ol>
  );
}

function TextCard({ text, rows, current, canEdit }: { text: GovernanceText; rows: ArticleRow[]; current: GovernanceText[]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const numbered = rows.filter((a) => a.number !== "تمهيد").length;
  return (
    <li className="rounded-md border border-rule p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <strong>{text.title}</strong>
          <span className="block text-xs text-ink-muted">
            {GOVERNANCE_KINDS[text.kind]}
            {text.version ? ` · ${text.version}` : ""}
            {text.approved_on ? ` · اعتمدته ${text.approved_by ? APPROVERS[text.approved_by] : "الجهة المختصة"} في ${text.approved_on}` : ""}
            {` · ${numbered ? `${numbered} مادة` : "بلا مواد مرقمة"}`}
          </span>
        </div>
        <span className="flex flex-wrap gap-1">
          {text.library_document_id && (
            <a href={`/documents/library/${text.library_document_id}`} target="_blank" className={buttonClass("secondary", "px-2 py-1 text-xs")}>
              <FileText size={14} aria-hidden="true" /> الملف
            </a>
          )}
          {canEdit && (
            <button type="button" onClick={() => setEditing((e) => !e)} className={buttonClass("secondary", "px-2 py-1 text-xs")}>
              {editing ? "إغلاق" : "تعديل"}
            </button>
          )}
          {canEdit && <ConfirmButton action={deleteGovernanceText.bind(null, text.id)} label="حذف" confirm="حذف الوثيقة وموادها؟ يبقى ملفها في مكتبة المستندات." />}
        </span>
      </div>
      {editing ? (
        <div className="mt-4">
          <GovernanceForm text={text} current={current} onDone={() => setEditing(false)} />
        </div>
      ) : (
        rows.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-primary">عرض المواد</summary>
            <div className="mt-3">
              <Articles rows={rows} />
            </div>
          </details>
        )
      )}
    </li>
  );
}

/** The company's bylaws, charters and policies: search across their articles, versions, and adding new ones. */
export function GovernanceTexts({ texts, articles, canEdit }: { texts: GovernanceText[]; articles: ArticleRow[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const current = texts.filter((t) => t.status === "current");
  const old = texts.filter((t) => t.status === "superseded");
  const byText = useMemo(() => {
    const m = new Map<string, ArticleRow[]>();
    for (const a of articles) m.set(a.text_id, [...(m.get(a.text_id) ?? []), a]);
    return m;
  }, [articles]);
  const q = fold(query.trim());
  const hits = q.length >= 2 ? current.flatMap((t) => (byText.get(t.id) ?? []).filter((a) => fold(`${a.heading ?? ""} ${a.body}`).includes(q) || a.number === query.trim()).map((a) => ({ t, a }))) : [];

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-rule bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-bold">النظام الأساس واللوائح</h2>
        <p className="mt-1 text-sm text-ink-muted">النظام الأساس ولوائح المجلس واللجان والسياسات المعتمدة، مقسمة إلى مواد يُبحث فيها، مع إصداراتها السابقة.</p>
        <ul className="mt-3 list-disc rounded-md border border-brass bg-brass-soft p-3 ps-8 text-xs leading-6">
          <li>ملف PDF الممسوح ضوئياً (صورة) لا يُقرأ نصه؛ الصق نص الوثيقة بنفسك في خانة «نص الوثيقة».</li>
          <li>تعرض الصفحة نحو 1000 مادة كحد أقصى من مجموع الوثائق؛ إن تجاوزتها قد لا تظهر المواد الزائدة. الوثائق المعتادة لا تبلغ هذا الحد.</li>
        </ul>
      </div>

      {current.length > 0 && (
        <div className="flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">ابحث في المواد</span>
            <Search size={16} aria-hidden="true" className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المواد: النصاب، الإنابة، 17 …" className={inputWith("ps-9")} />
          </label>
          {q.length >= 2 && (
            <div className="rounded-md bg-paper p-4">
              <p className="mb-3 text-xs text-ink-muted">{hits.length ? `${hits.length} نتيجة` : "لا نتائج."}</p>
              <ol className="flex flex-col gap-3 text-sm leading-7">
                {hits.slice(0, 50).map(({ t, a }) => (
                  <li key={`${t.id}-${a.position}`}>
                    <p className="font-medium">
                      {t.title} · {label(a)}
                      {a.heading ? `: ${a.heading}` : ""}
                    </p>
                    <p className="whitespace-pre-line text-ink-muted">{a.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {current.length === 0 ? (
        <p className="text-sm text-ink-muted">لم تُضف وثائق بعد. ابدأ بالنظام الأساس.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {current.map((t) => (
            <TextCard key={t.id} text={t} rows={byText.get(t.id) ?? []} current={current} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {old.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-ink-muted">الإصدارات السابقة ({old.length})</summary>
          <ul className="mt-3 flex flex-col gap-3">
            {old.map((t) => (
              <TextCard key={t.id} text={t} rows={byText.get(t.id) ?? []} current={current} canEdit={canEdit} />
            ))}
          </ul>
        </details>
      )}

      {canEdit && (
        <details className="rounded-md border border-dashed border-rule p-4">
          <summary className="cursor-pointer text-sm font-medium text-primary">إضافة وثيقة</summary>
          <div className="mt-4">
            <GovernanceForm current={current} />
          </div>
        </details>
      )}
    </section>
  );
}
