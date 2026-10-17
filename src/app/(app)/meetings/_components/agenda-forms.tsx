"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { EnglishField, buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { ITEM_KINDS } from "@/lib/meetings";
import { requestDocument, reviewDocumentRequest, saveAgendaItem } from "../_actions/agenda";
import { byDepartment, ownerOf, type Target } from "./agenda-targets";
import { useAutoEnglish } from "./auto-english";
import { onEditItem } from "./edit-item-event";
import { isRequirementsOnly, requirementsText, type Req } from "@/lib/requirements";
import { AUTHORITY } from "@/lib/authority";
import { ItemReviewPanel } from "./item-review-panel";
import { matchTemplate, suggestTitles, type Body, type Template, type TitleSuggestion } from "@/lib/item-templates";

export function TargetSelect({ name, targets, defaultValue, required, placeholder }: { name: string; targets: Target[]; defaultValue?: string; required?: boolean; placeholder: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={inputClass}>
      <option value="">{placeholder}</option>
      <optgroup label="الإدارات">
        {targets.filter((t) => t.group === "department").map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </optgroup>
      <UserGroups targets={targets} />
    </select>
  );
}

function UserGroups({ targets }: { targets: Target[] }) {
  return byDepartment(targets).map(([dept, users]) => (
    <optgroup key={dept || "-"} label={dept ? `أشخاص · ${dept}` : "أشخاص آخرون"}>
      {users.map((u) => (
        <option key={u.value + dept} value={u.value}>
          {u.label}
        </option>
      ))}
    </optgroup>
  ));
}

/** One choice for who owns the item and presents it; a different or outside presenter is optional. */
function OwnerField({ targets, item }: { targets: Target[]; item?: AgendaItem }) {
  const [owner, setOwner] = useState(item ? ownerOf(item) : "");
  const ownerUser = owner.startsWith("user:") ? owner.slice(5) : "";
  const differs = !!item?.presenter && (item.presenter_user_id ?? "") !== (item.owner_user_id ?? "");
  const [other, setOther] = useState(differs);
  const [choice, setChoice] = useState(item?.presenter_user_id ? `user:${item.presenter_user_id}` : item?.presenter ? "other" : "");
  const presenterUser = other ? (choice.startsWith("user:") ? choice.slice(5) : "") : ownerUser;
  const presenterLabel = targets.find((t) => t.value === (other ? choice : owner) && t.group === "user")?.label ?? "";
  return (
    <div className="flex flex-col gap-2">
      <select name="owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} aria-label="المسؤول عن البند">
        <option value="">—</option>
        <optgroup label="الإدارات">
          {targets.filter((t) => t.group === "department").map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </optgroup>
        <UserGroups targets={targets} />
      </select>
      <label className="flex w-fit items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} />
        يقدّمه شخص آخر
      </label>
      {other && (
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className={inputClass} aria-label="مقدّم البند">
          <option value="">—</option>
          <UserGroups targets={targets} />
          <option value="other">شخص من خارج النظام…</option>
        </select>
      )}
      <input type="hidden" name="presenter_user_id" value={presenterUser} />
      {other && choice === "other" ? <input name="presenter" defaultValue={item?.presenter ?? ""} placeholder="اسم مقدّم البند" required className={inputClass} /> : <input type="hidden" name="presenter" value={presenterLabel} />}
    </div>
  );
}

/** Title input that offers standard wordings as you type; picking one also sets the item's purpose. */
function TitleField({ defaultValue, library, body, onPicked }: { defaultValue?: string; library?: Template[]; body?: Body; onPicked?: () => void }) {
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const suggestions = typed ? suggestTitles(typed, 5, library, body) : [];
  const field = <T extends Element>(name: string) => ref.current?.form?.elements.namedItem(name) as T | null;

  /** Links the title to a standard wording (or to none) and lets the auto-filled description follow it. */
  const follow = (t: { title: string; en?: string; needs?: string; reqs?: Req[] } | null) => {
    const input = ref.current;
    if (!input) return;
    if (t?.en) {
      input.dataset.templateAr = t.title;
      input.dataset.templateEn = t.en;
    } else {
      delete input.dataset.templateAr;
      delete input.dataset.templateEn;
    }
    // Only a description that is still just the auto-filled requirements is replaced.
    const description = field<HTMLTextAreaElement>("description");
    if (!description || (description.value.trim() && !isRequirementsOnly(description.value))) return;
    const next = t?.reqs ? requirementsText(t.reqs) : t?.needs ? `المستندات الداعمة: ${t.needs}` : "";
    if (next === description.value) return;
    description.value = next;
    // The library's own English is exact; a company item's is machine-translated.
    const en = field<HTMLTextAreaElement>("description_en");
    if (t?.reqs && en && !en.dataset.manual) {
      en.value = requirementsText(t.reqs, true);
      const details = en.closest("details");
      if (details) details.open = true;
    } else onPicked?.();
  };

  // Opening a saved item refreshes an auto-filled description to the current requirements.
  useEffect(() => {
    if (defaultValue) follow(matchTemplate(defaultValue, library, body));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (s: TitleSuggestion) => {
    const input = ref.current;
    if (!input) return;
    input.value = s.title;
    const kind = field<HTMLSelectElement>("kind");
    if (kind) kind.value = s.kind;
    const en = field<HTMLInputElement>("title_en");
    if (en && s.en) {
      delete en.dataset.manual;
      en.value = s.en;
      const details = en.closest("details");
      if (details) details.open = true;
    }
    follow(s);
    setTyped("");
  };

  const onInput = (value: string) => {
    setTyped(value);
    follow(matchTemplate(value, library, body));
  };

  return (
    <div className="flex flex-col gap-2">
      <input ref={ref} name="title" spellCheck lang="ar" defaultValue={defaultValue} required autoComplete="off" onInput={(e) => onInput(e.currentTarget.value)} className={inputClass} />
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">صيغ مقترحة:</span>
          {suggestions.map((s) => (
            <button key={s.title} type="button" onClick={() => pick(s)} className="flex flex-col rounded-md border border-primary px-2 py-1 text-start text-sm text-primary hover:bg-primary-soft">
              {s.title}
              {s.authority && <span className="text-xs text-brass">{AUTHORITY[s.authority].label}</span>}
              {s.needs && <span className="text-xs text-ink-muted">يتطلب: {s.needs}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TranslateHint = () => <p className="text-xs text-brass">تعذّرت الترجمة الآلية الآن؛ أكمل النص الإنجليزي يدوياً أو أعد المحاولة بعد قليل.</p>;

export type AgendaItem = {
  id: string;
  position: number;
  title: string;
  title_en?: string | null;
  description: string | null;
  description_en?: string | null;
  kind: keyof typeof ITEM_KINDS;
  duration_minutes: number | null;
  presenter: string | null;
  presenter_user_id?: string | null;
  department_id: string | null;
  owner_user_id?: string | null;
};

export function AgendaItemForm({ meetingId, item, targets, library, body, onDone }: { meetingId: string; item?: AgendaItem; targets: Target[]; library?: Template[]; body?: Body; onDone?: () => void }) {
  const [state, action] = useActionState(async (prev: Parameters<typeof saveAgendaItem>[2], form: FormData) => {
    const result = await saveAgendaItem(meetingId, item?.id ?? null, prev, form);
    if (result?.ok) onDone?.();
    return result;
  }, null);
  const ref = useRef<HTMLFormElement>(null);
  const auto = useAutoEnglish(ref, { title: "title_en", description: "description_en" });

  return (
    <ActionForm ref={ref} action={action} state={state} onInput={auto.onInput} onReset={auto.onReset} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="عنوان البند">
          <TitleField defaultValue={item?.title} library={library} body={body} onPicked={() => auto.sync("description")} />
          <EnglishField name="title_en" defaultValue={item?.title_en} />
          {auto.failed.includes("title") && <TranslateHint />}
        </Field>
      </div>
      <Field label="الغرض">
        <select name="kind" defaultValue={item?.kind ?? "discussion"} className={inputClass}>
          {Object.entries(ITEM_KINDS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="المدة (دقائق)">
        <input name="duration_minutes" type="number" min={1} max={480} defaultValue={item?.duration_minutes ?? ""} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="المسؤول عن البند ومقدّمه" hint="إلزامي لبنود القرار؛ تُرسل إليه طلبات المستندات.">
          <OwnerField targets={targets} item={item} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="الوصف">
          <textarea spellCheck lang="ar" name="description" rows={3} defaultValue={item?.description ?? ""} className={inputClass} />
          <EnglishField name="description_en" rows={3} defaultValue={item?.description_en} />
          {auto.failed.includes("description") && <TranslateHint />}
        </Field>
      </div>
      <ItemReviewPanel meetingId={meetingId} itemId={item?.id} form={() => ref.current} />
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
          {item ? "حفظ البند" : "إضافة البند"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function EditableAgendaItem({ meetingId, item, targets, library, body, children }: { meetingId: string; item: AgendaItem; targets: Target[]; library?: Template[]; body?: Body; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  useEffect(() => onEditItem(item.id, () => setEditing(true)), [item.id]);
  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <AgendaItemForm meetingId={meetingId} item={item} targets={targets} library={library} body={body} onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="w-fit text-sm text-ink-muted hover:underline">
          إلغاء
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {children}
      <button type="button" onClick={() => setEditing(true)} className="w-fit text-sm text-primary hover:underline">
        تعديل البند
      </button>
    </div>
  );
}

export function DocumentRequestForm({ meetingId, itemId, targets, owner, dueDate }: { meetingId: string; itemId: string; targets: Target[]; owner: string; dueDate?: string }) {
  const [state, action] = useActionState(requestDocument.bind(null, meetingId, itemId), null);
  return (
    <details>
      <summary className="cursor-pointer text-sm text-primary">طلب مستند داعم من المسؤول</summary>
      <ActionForm action={action} state={state} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input name="title" spellCheck lang="ar" placeholder="المستند المطلوب" required className={inputClass} />
        <TargetSelect name="target" targets={targets} defaultValue={owner} required placeholder="المطلوب منه" />
        <input name="due_date" type="date" aria-label="آخر موعد" defaultValue={dueDate} className={inputClass} />
        <div className="flex flex-col gap-2 sm:col-span-3">
          <FormMessage state={state} />
          <SubmitButton variant="secondary" pendingLabel="…" className="w-fit">
            إرسال الطلب
          </SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}

export function ReviewDocumentButtons({ meetingId, requestId }: { meetingId: string; requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => reviewDocumentRequest(meetingId, requestId, "accepted"))} className={buttonClass("secondary", "px-3 py-1 text-xs")}>
        اعتماد
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const note = window.prompt("ما المطلوب تعديله؟");
          if (note) start(() => reviewDocumentRequest(meetingId, requestId, "returned", note));
        }}
        className={buttonClass("danger", "px-3 py-1 text-xs")}
      >
        إعادة للتعديل
      </button>
    </span>
  );
}
