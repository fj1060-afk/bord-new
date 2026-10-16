"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useRef, useState } from "react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { scanItem, type ScanResult } from "@/lib/item-scan";
import { BODIES, CATEGORIES, searchTemplates, type Body, type Template } from "@/lib/item-templates";
import { ITEM_KINDS } from "@/lib/meetings";
import { addLibraryItem, removeLibraryItem } from "../_actions/library";
import { ItemFindings } from "../_components/item-review-panel";
import { AuthorityBadge } from "../_components/authority-badge";

type Item = Template & { id: string | null; own: boolean; key: string };

/** Searchable library grouped by category; organizers add (after the compliance scan) and remove the company's own items. */
export function LibraryBrowser({ items, organizer, listed }: { items: Item[]; organizer: boolean; listed: boolean }) {
  const [query, setQuery] = useState("");
  const [body, setBody] = useState<Body | "">("");
  const standard = items.filter((i) => !i.own);
  const byBody = body ? items.filter((i) => i.body === body || i.body === "any") : items;
  const shown = query.trim().length >= 3 ? searchTemplates(query, byBody) : byBody;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في البنود… مثل: تعي، قرض، عقد" className={`${inputClass} max-w-md`} />
        <select value={body} onChange={(e) => setBody(e.target.value as Body | "")} aria-label="الاجتماع" className={`${inputClass} w-fit`}>
          <option value="">كل الاجتماعات</option>
          {(Object.keys(BODIES) as Body[])
            .filter((b) => b !== "any")
            .map((b) => (
              <option key={b} value={b}>
                {BODIES[b]}
              </option>
            ))}
        </select>
        <span className="text-sm text-ink-muted">{shown.length} بند</span>
      </div>
      {organizer && <AddItemForm standard={standard} listed={listed} />}
      {CATEGORIES.map((category) => {
        const group = shown.filter((i) => i.category === category);
        if (!group.length) return null;
        return (
          <section key={category} className="rounded-lg border border-rule bg-surface">
            <h2 className="border-b border-rule px-5 py-3 font-display text-lg font-bold">
              {category} <span className="text-sm font-normal text-ink-muted">({group.length})</span>
            </h2>
            <ul className="divide-y divide-rule">
              {group.map((i) => (
                <li key={i.key} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="leading-7">{i.title}</span>
                    {i.en && (
                      <span dir="ltr" className="text-start text-xs text-ink-muted">
                        {i.en}
                      </span>
                    )}
                    {i.needs && <span className="text-xs text-ink-muted">يتطلب: {i.needs}</span>}
                    {i.own && <ScanBadge result={scanItem({ title: i.title, en: i.en, kind: i.kind, body: i.body, needs: i.needs }, standard, listed)} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{ITEM_KINDS[i.kind]}</span>
                    <AuthorityBadge authority={i.authority} />
                    {i.body !== "any" && <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-muted">{BODIES[i.body]}</span>}
                    {i.own && <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs text-brass">خاص بالشركة</span>}
                    {organizer && i.id && <ConfirmButton action={removeLibraryItem.bind(null, i.id)} label="حذف" confirm="حذف هذه الصيغة من المستودع؟" />}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ScanBadge({ result }: { result: ScanResult }) {
  const warns = result.findings.filter((f) => f.level === "warn");
  if (result.passed) return <span className="text-xs text-primary">✓ اجتاز المسح النظامي</span>;
  return (
    <details className="text-xs">
      <summary className="w-fit cursor-pointer text-danger">ملاحظات نظامية ({warns.length})</summary>
      <div className="mt-2 text-sm">
        <ItemFindings findings={warns} />
      </div>
    </details>
  );
}

/** Live compliance scan while typing; the server repeats it on save. */
function AddItemForm({ standard, listed }: { standard: Template[]; listed: boolean }) {
  const [state, action] = useActionState(addLibraryItem, null);
  const ref = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState({ title: "", en: "", kind: "decision", body: "board" as Body, needs: "" });
  const scan = draft.title.trim().length >= 5 ? scanItem(draft, standard, listed) : null;
  const read = () => {
    const f = ref.current;
    if (!f) return;
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value;
    setDraft({ title: v("title"), en: v("title_en"), kind: v("kind"), body: v("body") as Body, needs: v("needs") });
  };
  const useTitle = (title: string) => {
    (ref.current?.elements.namedItem("title") as HTMLInputElement).value = title;
    read();
  };
  return (
    <details className="rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة صيغة للمستودع</summary>
      <ActionForm ref={ref} action={action} state={state} onInput={read} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="صيغة البند" hint="استخدم (…) للأجزاء التي تُكمل عند كل اجتماع.">
            <input name="title" required spellCheck lang="ar" className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="الصيغة بالإنجليزية">
            <input name="title_en" dir="ltr" lang="en" className={inputClass} />
          </Field>
        </div>
        <Field label="الغرض">
          <select name="kind" defaultValue="decision" className={inputClass}>
            {Object.entries(ITEM_KINDS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الاجتماع">
          <select name="body" defaultValue="board" className={inputClass}>
            {(Object.keys(BODIES) as Body[]).map((b) => (
              <option key={b} value={b}>
                {BODIES[b]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="التصنيف">
          <select name="category" defaultValue="بنود الشركة" className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="المستندات الداعمة المطلوبة" hint="اختياري؛ تُكتب في وصف البند عند اختياره.">
          <input name="needs" className={inputClass} />
        </Field>
        {scan && (
          <div className="flex flex-col gap-2 rounded-lg border border-rule bg-paper p-4 text-sm sm:col-span-2">
            <strong className={scan.passed ? "text-primary" : "text-danger"}>{scan.passed ? "✓ اجتاز المسح النظامي (نظام الشركات، لائحة الحوكمة، قواعد هيئة السوق المالية)" : "المسح النظامي: ملاحظات تحتاج معالجة"}</strong>
            {scan.similar && <p className="text-ink-muted">توجد صيغة مشابهة في المستودع: «{scan.similar}»</p>}
            {scan.findings.length > 0 && <ItemFindings findings={scan.findings} onFix={useTitle} />}
            {!scan.passed && (
              <label className="flex w-fit items-center gap-2 text-xs">
                <input type="checkbox" name="accept" value="1" /> أؤكد الحفظ رغم الملاحظات
              </label>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="جارٍ الفحص…" className="w-fit">
            فحص وحفظ
          </SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}
