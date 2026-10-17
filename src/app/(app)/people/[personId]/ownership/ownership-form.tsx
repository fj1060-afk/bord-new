"use client";

import { Collapse } from "@/components/ui/collapse";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Field, FormMessage, inputClass, type ActionState } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { noticeDeadline, type Holding, type OwnershipNotice } from "@/lib/declarations";
import { formatGregorianDate } from "@/lib/format";
import { saveOwnershipNotice } from "../actions";

const holding = (): Holding => ({ name: "", id: "", relation: "", shares: "", percent: "" });

function Holdings({ rows, onChange, reason }: { rows: Holding[]; onChange: (rows: Holding[]) => void; reason?: boolean }) {
  const set = (i: number, patch: Partial<Holding>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const cols: [keyof Holding, string][] = [["name", "الاسم"], ["id", "رقم الهوية / السجل التجاري"], ["relation", "طبيعة العلاقة (المصلحة)"], ["shares", "عدد وفئة الأسهم"], ["percent", "النسبة %"], ...(reason ? ([["reason", "سبب التغيير"]] as [keyof Holding, string][]) : [])];
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-rule p-2 sm:grid-cols-[repeat(3,1fr)_auto]">
          {cols.map(([k, label]) => (
            <input key={k} aria-label={label} placeholder={label} value={r[k] ?? ""} dir={k === "id" || k === "percent" ? "ltr" : undefined} onChange={(e) => set(i, { [k]: e.target.value })} className={inputClass} />
          ))}
          <button type="button" aria-label="حذف السطر" onClick={() => onChange(rows.filter((_, j) => j !== i))} className={buttonClass("secondary", "px-2")}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, holding()])} className={buttonClass("secondary", "w-fit")}>
        <Plus size={16} aria-hidden="true" /> إضافة شخص
      </button>
    </div>
  );
}

const yesNo = (label: string, value: boolean, set: (v: boolean) => void) => (
  <fieldset className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
    <legend className="mb-1">{label}</legend>
    <label className="flex items-center gap-1">
      <input type="radio" checked={value} onChange={() => set(true)} /> نعم
    </label>
    <label className="flex items-center gap-1">
      <input type="radio" checked={!value} onChange={() => set(false)} /> لا
    </label>
  </fieldset>
);

/** Tadawul's notice of owning, or a change in, 5% or more, filled here and printed for signature. */
export function OwnershipForm({ personId, initial }: { personId: string; initial: Pick<OwnershipNotice, "name" | "issuer" | "phone" | "email"> }) {
  const router = useRouter();
  const [n, setN] = useState<OwnershipNotice>({
    type: "holder", id: "", direct: { shares: "", percent: "" }, relatives: false, controlled: false, concert: false, interests: [],
    before: { shares: "", percent: "" }, after: { shares: "", percent: "" }, changes: [], acquisition: "شراء من السوق", funding: "شخصي",
    noticeDate: new Date().toISOString().slice(0, 10), eventDate: "", ...initial,
  });
  const [state, setState] = useState<ActionState>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<OwnershipNotice>) => setN((x) => ({ ...x, ...patch }));
  const anyInterest = n.relatives || n.controlled || n.concert;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await saveOwnershipNotice(personId, { ...n, interests: anyInterest ? n.interests : [], changes: n.type === "change" ? n.changes : [] });
    setBusy(false);
    setState(result);
    if (result.ok && result.id) router.push(`/print/ownership/${result.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-rule bg-surface p-5 sm:grid-cols-2">
      <Field label="1. اسم الشخص">
        <input value={n.name} onChange={(e) => set({ name: e.target.value })} required className={inputClass} />
      </Field>
      <Field label="رقم الهوية / السجل التجاري">
        <input value={n.id} dir="ltr" onChange={(e) => set({ id: e.target.value })} required className={inputClass} />
      </Field>
      <Field label="نوع الإشعار">
        <select value={n.type} onChange={(e) => set({ type: e.target.value as OwnershipNotice["type"] })} className={inputClass}>
          <option value="holder">مالك أو له مصلحة في 5% أو أكثر</option>
          <option value="change">تغيير المصلحة</option>
        </select>
      </Field>
      <Field label="2. اسم المصدر المدرج الذي تم التملك به">
        <input value={n.issuer} onChange={(e) => set({ issuer: e.target.value })} required className={inputClass} />
      </Field>
      <Field label="3. الملكية المباشرة: عدد وفئة الأسهم">
        <input value={n.direct.shares} onChange={(e) => set({ direct: { ...n.direct, shares: e.target.value } })} className={inputClass} />
      </Field>
      <Field label="النسبة %">
        <input value={n.direct.percent} dir="ltr" inputMode="decimal" onChange={(e) => set({ direct: { ...n.direct, percent: e.target.value } })} className={inputClass} />
      </Field>
      <strong className="text-sm sm:col-span-2">4. ما له مصلحة فيه</strong>
      {yesNo("أ. هل هناك أسهم مملوكة أو مسيطر عليها من قبل أقرباء الشخص؟", n.relatives, (v) => set({ relatives: v }))}
      {yesNo("ب. هل هناك أسهم مملوكة أو مسيطر عليها من قبل شركة يسيطر عليها ذلك الشخص؟", n.controlled, (v) => set({ controlled: v }))}
      {yesNo("ج. هل هناك أسهم مملوكة أو مسيطر عليها من قبل أشخاص يتصرفون بالاتفاق مع الشخص؟", n.concert, (v) => set({ concert: v }))}
      {anyInterest && <Holdings rows={n.interests} onChange={(interests) => set({ interests })} />}
      <Collapse show={n.type === "change"}>
        {n.type === "change" && (
          <>
            <strong className="text-sm sm:col-span-2">6. تغيير المصلحة</strong>
            <Field label="عدد وفئة الأسهم قبل التغيير">
              <input value={n.before.shares} onChange={(e) => set({ before: { ...n.before, shares: e.target.value } })} className={inputClass} />
            </Field>
            <Field label="النسبة قبل التغيير %">
              <input value={n.before.percent} dir="ltr" onChange={(e) => set({ before: { ...n.before, percent: e.target.value } })} className={inputClass} />
            </Field>
            <Field label="عدد وفئة الأسهم بعد التغيير">
              <input value={n.after.shares} onChange={(e) => set({ after: { ...n.after, shares: e.target.value } })} className={inputClass} />
            </Field>
            <Field label="النسبة بعد التغيير %">
              <input value={n.after.percent} dir="ltr" onChange={(e) => set({ after: { ...n.after, percent: e.target.value } })} className={inputClass} />
            </Field>
            <strong className="text-sm sm:col-span-2">7. تفاصيل تغيير المصلحة</strong>
            <Holdings rows={n.changes} onChange={(changes) => set({ changes })} reason />
          </>
        )}
      </Collapse>
      <Field label="8. تفاصيل عملية التملك">
        <input value={n.acquisition} onChange={(e) => set({ acquisition: e.target.value })} list="acq" className={inputClass} />
        <datalist id="acq">
          <option value="شراء من السوق" />
        </datalist>
      </Field>
      <Field label="9. مصدر التمويل">
        <input value={n.funding} onChange={(e) => set({ funding: e.target.value })} list="fund" className={inputClass} />
        <datalist id="fund">
          <option value="شخصي" />
        </datalist>
      </Field>
      <strong className="text-sm sm:col-span-2">10. بيانات الاتصال</strong>
      <Field label="الجوال">
        <input value={n.phone} dir="ltr" onChange={(e) => set({ phone: e.target.value })} className={inputClass} />
      </Field>
      <Field label="البريد الإلكتروني">
        <input value={n.email} dir="ltr" type="email" onChange={(e) => set({ email: e.target.value })} className={inputClass} />
      </Field>
      <Field label="تاريخ وقوع الحدث (تنفيذ الصفقة)">
        <input type="date" value={n.eventDate} onChange={(e) => set({ eventDate: e.target.value })} required className={inputClass} />
      </Field>
      <Field label="تاريخ التبليغ">
        <input type="date" value={n.noticeDate} onChange={(e) => set({ noticeDate: e.target.value })} className={inputClass} />
      </Field>
      {n.eventDate && (
        <p className="rounded-md bg-brass-soft p-3 text-sm sm:col-span-2">
          يُقدّم النموذج موقّعاً إلى تداول السعودية (إدارة ترخيص الإدراج وحوكمة المصدرين) على Ownership@Tadawul.com.sa في موعد أقصاه نهاية ثالث يوم تداول بعد الحدث: {formatGregorianDate(new Date(`${noticeDeadline(n.eventDate)}T12:00:00Z`))}.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FormMessage state={state} />
        <button disabled={busy} className={buttonClass("primary", "w-fit")}>
          {busy ? "جارٍ الحفظ…" : "حفظ وإعداد النموذج للطباعة"}
        </button>
      </div>
    </form>
  );
}
