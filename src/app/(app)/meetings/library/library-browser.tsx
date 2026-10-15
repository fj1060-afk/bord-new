"use client";

import { useActionState, useState } from "react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { CATEGORIES, searchTemplates, type Template } from "@/lib/item-templates";
import { ITEM_KINDS } from "@/lib/meetings";
import { addLibraryItem, removeLibraryItem } from "../_actions/library";

type Item = Template & { id: string | null; own: boolean; key: string };

/** Searchable library grouped by category; organizers add and remove the company's own items. */
export function LibraryBrowser({ items, organizer }: { items: Item[]; organizer: boolean }) {
  const [query, setQuery] = useState("");
  const shown = query.trim().length >= 3 ? searchTemplates(query, items) : items;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في البنود… مثل: تعي، قرض، عقد" className={`${inputClass} max-w-md`} />
        <span className="text-sm text-ink-muted">{shown.length} بند</span>
      </div>
      {organizer && <AddItemForm />}
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
                    {i.needs && <span className="text-xs text-ink-muted">يتطلب: {i.needs}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{ITEM_KINDS[i.kind]}</span>
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

function AddItemForm() {
  const [state, action] = useActionState(addLibraryItem, null);
  return (
    <details className="rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة صيغة للمستودع</summary>
      <form action={action} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="صيغة البند" hint="استخدم (…) للأجزاء التي تُكمل عند كل اجتماع.">
            <input name="title" required spellCheck lang="ar" className={inputClass} />
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
        <Field label="التصنيف">
          <select name="category" defaultValue="بنود الشركة" className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="المستندات الداعمة المطلوبة" hint="اختياري؛ تُكتب في وصف البند عند اختياره.">
            <input name="needs" className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            حفظ
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}
