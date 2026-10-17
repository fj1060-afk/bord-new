"use client";

import { Collapse } from "@/components/ui/collapse";
import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { EnglishField, Field, FormMessage, inputClass, SubmitButton, inputWith } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { POSITION_ROLES, type PositionRole } from "@/lib/affiliations";
import { BOARD_CATEGORIES, BOARD_POSITIONS } from "@/lib/org";
import { registerBoardMember } from "../actions";

type Row = { organization: string; role: PositionRole; title: string; listed: boolean; start_year: string; end_year: string; current: boolean };
const blank = (): Row => ({ organization: "", role: "board_member", title: "", listed: false, start_year: "", end_year: "", current: true });

function Group({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-rule bg-surface p-5 sm:grid-cols-2">
      <legend className="px-2 font-display text-lg font-bold">{title}</legend>
      {intro && <p className="text-xs text-ink-muted sm:col-span-2">{intro}</p>}
      {children}
    </fieldset>
  );
}

/** One form for a new board member: identity, CV positions, the board seat and a sign-in account. */
export function RegisterMemberForm({ boardId, accountsReady }: { boardId: string; accountsReady: boolean }) {
  const [state, action] = useActionState(registerBoardMember.bind(null, boardId), null);
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [basis, setBasis] = useState("elected");
  const [account, setAccount] = useState(accountsReady);
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const positions = rows
    .filter((r) => r.organization.trim())
    .map((r) => ({ organization: r.organization, role: r.role, title: r.title, listed: r.listed, start_year: Number(r.start_year) || undefined, end_year: r.current ? null : Number(r.end_year) || null }));

  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-6">
      <Group title="البيانات الشخصية">
        <Field label="الاسم الكامل">
          <input name="full_name" required spellCheck lang="ar" className={inputClass} />
          <EnglishField name="full_name_en" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" dir="ltr" required={account} className={inputClass} />
        </Field>
        <Field label="الجوال">
          <input name="phone" type="tel" dir="ltr" className={inputClass} />
        </Field>
        <Field label="الجنسية">
          <input name="nationality" className={inputClass} />
        </Field>
        <Field label="رقم الهوية أو الإقامة" hint="بيانات شخصية: يراها العضو ومحررو ملفات الأعضاء فقط.">
          <input name="national_id" dir="ltr" className={inputClass} />
        </Field>
        <Field label="العنوان الوطني">
          <input name="address" className={inputClass} />
        </Field>
      </Group>

      <Group title="السيرة الذاتية" intro="أدخل كل جهة للعضو فيها منصب أو ملكية أو شراكة. إذا ذكر بند أو قرار جهةً للعضو فيها منصب حالي، ينبّه النظام تلقائياً إلى مصلحة محتملة.">
        <Field label="المسمى الوظيفي الحالي">
          <input name="job_title" className={inputClass} />
        </Field>
        <Field label="جهة العمل الحالية">
          <input name="organization" className={inputClass} />
        </Field>
        <Field label="المؤهلات العلمية">
          <textarea name="qualifications" rows={3} spellCheck lang="ar" className={inputClass} />
        </Field>
        <Field label="نبذة عن الخبرات">
          <textarea name="experience" rows={3} spellCheck lang="ar" className={inputClass} />
        </Field>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <strong className="text-sm">المناصب والجهات</strong>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-3 rounded-md border border-rule p-3 sm:grid-cols-[2fr_1.4fr_1fr_auto]">
              <input aria-label="الجهة" placeholder="الجهة: شركة …" value={r.organization} onChange={(e) => set(i, { organization: e.target.value })} className={inputClass} />
              <select aria-label="الصفة" value={r.role} onChange={(e) => set(i, { role: e.target.value as PositionRole })} className={inputClass}>
                {Object.entries(POSITION_ROLES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input aria-label="المسمى" placeholder="المسمى أو نسبة الملكية" value={r.title} onChange={(e) => set(i, { title: e.target.value })} className={inputClass} />
              <button type="button" aria-label="حذف السطر" onClick={() => setRows((all) => (all.length > 1 ? all.filter((_, j) => j !== i) : [blank()]))} className={buttonClass("secondary", "px-2")}>
                <X size={16} aria-hidden="true" />
              </button>
              <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-4">
                <label className="flex items-center gap-1">
                  من <input type="number" min={1950} max={2100} value={r.start_year} onChange={(e) => set(i, { start_year: e.target.value })} className={inputWith("w-24")} />
                </label>
                <label className="flex items-center gap-1">
                  إلى <input type="number" min={1950} max={2100} value={r.end_year} disabled={r.current} onChange={(e) => set(i, { end_year: e.target.value })} className={inputWith("w-24")} />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={r.current} onChange={(e) => set(i, { current: e.target.checked })} /> حالي
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={r.listed} onChange={(e) => set(i, { listed: e.target.checked })} /> شركة مدرجة
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRows((r) => [...r, blank()])} className={buttonClass("secondary", "w-fit")}>
            <Plus size={16} aria-hidden="true" /> سطر آخر
          </button>
          <input type="hidden" name="positions" value={JSON.stringify(positions)} />
        </div>
      </Group>

      <Group title="العضوية في المجلس">
        <Field label="المنصب">
          <select name="position" defaultValue="member" className={inputClass}>
            {Object.entries(BOARD_POSITIONS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الصفة">
          <select name="category" defaultValue="non_executive" className={inputClass}>
            {Object.entries(BOARD_CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="طريقة العضوية">
          <select name="appointment_basis" value={basis} onChange={(e) => setBasis(e.target.value)} className={inputClass}>
            <option value="elected">منتخب من الجمعية العامة</option>
            <option value="appointed_vacancy">معيّن في مقعد شاغر</option>
            <option value="representative">ممثل لجهة</option>
          </select>
        </Field>
        <Collapse show={basis === "representative"}>
          {basis === "representative" && (
            <Field label="الجهة التي يمثلها">
              <input name="represents" required className={inputClass} />
            </Field>
          )}
        </Collapse>
        <Field label="قرار التعيين" hint={basis === "appointed_vacancy" ? "قرار المجلس بالتعيين في المقعد الشاغر، ويُعرض على أول جمعية لإقراره." : "رقم قرار الجمعية العامة وتاريخه."}>
          <input name="appointment_ref" className={inputClass} />
        </Field>
        <Field label="تاريخ بداية العضوية">
          <input name="start_date" type="date" className={inputClass} />
        </Field>
      </Group>

      <Group title="حساب الدخول">
        {accountsReady ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="create_account" checked={account} onChange={(e) => setAccount(e.target.checked)} /> إنشاء حساب دخول بصلاحية «عضو مجلس»
            </label>
            {account && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="send_invite" defaultChecked /> إرسال الدعوة إلى بريده الآن
              </label>
            )}
            <p className="text-xs text-ink-muted sm:col-span-2">تصله رسالة لتعيين كلمة المرور. إن كان له حساب بالبريد نفسه يُربط به. خدمة الإرسال المجانية محدودة بعدد قليل من الرسائل في الساعة.</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted sm:col-span-2">إنشاء الحسابات غير مهيأ على الخادم؛ أنشئ الحساب لاحقاً من صفحة المستخدمين واربطه من ملف العضو.</p>
        )}
      </Group>

      <div className="flex flex-col gap-2">
        <FormMessage state={state} />
        <SubmitButton pendingLabel="جارٍ التسجيل…" className="w-fit">
          تسجيل العضو
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
