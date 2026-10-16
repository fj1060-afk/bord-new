"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { EnglishField, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { COMPANY_TYPES, type CompanyProfile } from "@/lib/company";
import { saveCompanyProfile } from "./actions";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-rule bg-surface p-5 sm:grid-cols-2">
      <legend className="px-2 font-display text-lg font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function CompanyForm({ profile, people, canEdit }: { profile: CompanyProfile; people: { id: string; full_name: string }[]; canEdit: boolean }) {
  const [state, action] = useActionState(saveCompanyProfile, null);
  const num = (name: keyof CompanyProfile, label: string, min: number, max: number, hint?: string) => (
    <Field label={label} hint={hint}>
      <input name={name} type="number" min={min} max={max} required defaultValue={String(profile[name])} className={inputClass} />
    </Field>
  );
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-6">
      <fieldset disabled={!canEdit} className="flex flex-col gap-6">
        <Section title="الشركة">
          <Field label="اسم الشركة">
            <input name="name" defaultValue={profile.name} className={inputClass} />
            <EnglishField name="name_en" defaultValue={profile.name_en} />
          </Field>
          <Field label="لغة المستندات المطبوعة" hint="جدول الأعمال وكشف الحضور والمحضر.">
            <select name="document_language" defaultValue={profile.document_language} className={inputClass}>
              <option value="ar">عربي</option>
              <option value="bilingual">عربي وإنجليزي</option>
            </select>
          </Field>
          <Field label="نوع الشركة" hint="يحدد الأنظمة واللوائح التي تُطبّق قواعدها.">
            <select name="company_type" defaultValue={profile.company_type} className={inputClass}>
              {Object.entries(COMPANY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نهاية السنة المالية">
            <select name="fiscal_year_end_month" defaultValue={profile.fiscal_year_end_month} className={inputClass}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="أحكام نظام الشركة الأساس">
          {num("min_board_meetings", "الحد الأدنى لاجتماعات المجلس في السنة", 1, 24, "نظام الشركات م80: أربعة على الأقل لشركات المساهمة.")}
          {num("invite_days", "إرسال الدعوة قبل الاجتماع (أيام)", 0, 30, "لائحة الحوكمة م30/ج: خمسة أيام على الأقل.")}
          {num("quorum_percent", "نصاب المجلس (% من الأعضاء)", 50, 100, "نظام الشركات م80/2: النصف على الأقل.")}
          {num("quorum_min_present", "أقل عدد للحاضرين", 1, 20, "لائحة الحوكمة م30/د: ثلاثة على الأقل.")}
          {num("max_term_years", "أقصى مدة لدورة المجلس (سنوات)", 1, 4, "نظام الشركات م68: أربع سنوات كحد أقصى.")}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="proxy_allowed" defaultChecked={profile.proxy_allowed} />
            يسمح نظام الشركة الأساس بالإنابة بين الأعضاء (م81)
          </label>
        </Section>

        <Section title="أمين سر المجلس">
          <Field label="أمين السر">
            <select name="secretary_person_id" defaultValue={profile.secretary_person_id ?? ""} className={inputClass}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ التعيين">
            <input name="secretary_appointed_on" type="date" defaultValue={profile.secretary_appointed_on ?? ""} className={inputClass} />
          </Field>
          <Field label="قرار التعيين" hint="يعيّنه المجلس (نظام الشركات م78/4) ولا يُعزل إلا بقراره.">
            <input name="secretary_resolution" defaultValue={profile.secretary_resolution ?? ""} placeholder="رقم القرار وتاريخه" className={inputClass} />
          </Field>
          <Field label="المؤهل والخبرة" hint="الدليل الاسترشادي: شهادة جامعية وخبرة 3 سنوات، أو خبرة 5 سنوات.">
            <input name="secretary_qualification" defaultValue={profile.secretary_qualification ?? ""} className={inputClass} />
          </Field>
        </Section>
      </fieldset>
      {canEdit && (
        <div className="flex flex-col gap-2">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="…" className="w-fit">
            حفظ
          </SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
