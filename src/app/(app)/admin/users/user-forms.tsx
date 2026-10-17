"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { Collapse } from "@/components/ui/collapse";
import { PasswordField } from "@/components/ui/password-field";
import { EmailField, PhoneField } from "@/components/ui/contact-fields";
import { checkNewUser, createUser, setUserPassword } from "./actions";
import type { RoleOption, UserItem } from "./page";
import type { Duplicate } from "@/lib/user-duplicates";

export function RoleChecklist({ roles, selected, onChange, grid }: { roles: RoleOption[]; selected?: string[]; onChange?: (ids: string[]) => void; /** Two even columns (the side panel). */ grid?: boolean }) {
  return (
    <fieldset className={grid ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"} onChange={(e) => onChange?.([...(e.currentTarget as HTMLFieldSetElement).querySelectorAll<HTMLInputElement>("input:checked")].map((i) => i.value))}>
      <legend className={grid ? "col-span-2 mb-2 text-sm font-medium" : "mb-2 text-sm font-medium"}>الأدوار</legend>
      {roles.map((role) => (
        <label key={role.id} className="motion-colors flex cursor-pointer items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
          <input type="checkbox" name="role" value={role.id} defaultChecked={selected?.includes(role.id)} className="accent-primary" />
          {role.name}
        </label>
      ))}
    </fieldset>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
    <legend className="mb-3 text-xs font-medium text-ink-muted">{title}</legend>
    {children}
  </fieldset>
);

export type Option = { id: string; name: string };

/** A new user; inside a department the user joins it automatically (no department field is shown). */
export function CreateUserForm({ roles, departments, departmentId }: { roles: RoleOption[]; departments: Option[]; departmentId?: string }) {
  const [state, action] = useActionState(createUser, null);
  const [method, setMethod] = useState<"password" | "invite">("password");
  const [who, setWho] = useState({ name: "", email: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const admin = roles.some((r) => picked.includes(r.id) && /مدير النظام/.test(r.name));
  // Duplicates of an existing user's name, email or mobile, checked when a field is left.
  const [clashes, setClashes] = useState<Duplicate[]>([]);
  const check = (form: HTMLFormElement) => {
    const value = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
    checkNewUser({ name: value("full_name"), email: value("email"), phone: value("phone") }).then(setClashes, () => setClashes([]));
  };

  return (

      <ActionForm action={action} state={state} className="grid gap-6 sm:grid-cols-2" onBlur={(e) => check(e.currentTarget)} onInput={(e) => {
        const f = e.currentTarget;
        setWho({ name: (f.elements.namedItem("full_name") as HTMLInputElement).value, email: (f.elements.namedItem("email") as HTMLInputElement).value });
      }}>
        <Section title="البيانات">
          <Field label="الاسم الكامل">
            <input name="full_name" required className={inputClass} />
          </Field>
          <Field label="البريد الإلكتروني" hint="يدخل به المستخدم إلى المنصة.">
            <EmailField name="email" required />
          </Field>
          <Field label="الجوال">
            <PhoneField name="phone" />
          </Field>
          <Field label="المسمى الوظيفي">
            <input name="job_title" className={inputClass} />
          </Field>
        </Section>

        {departmentId !== undefined ? (
          <input type="hidden" name="department_id" value={departmentId} />
        ) : (
          <Section title="الجهة التابع لها">
            <Field label="الإدارة" hint="يصبح مندوبها: تصله طلبات المستندات والمتطلبات الموجهة لها.">
              <select name="department_id" defaultValue="" className={inputClass}>
                <option value="">بلا إدارة</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        )}

        <div className="sm:col-span-2">
          <RoleChecklist roles={roles} onChange={setPicked} />
          <Collapse show={admin}>
            <p className="mt-2 rounded-md bg-brass-soft px-3 py-2 text-xs text-brass">«مدير النظام» يمنح صلاحية كاملة على المنصة، ومنها المستخدمون والأدوار والحذف.</p>
          </Collapse>
        </div>

        <fieldset className="flex flex-col gap-3 sm:col-span-2">
          <legend className="mb-3 text-xs font-medium text-ink-muted">طريقة الدخول</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["password", "تعيين كلمة مرور الآن"],
                ["invite", "دعوة بالبريد يختار فيها كلمة مروره"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="motion-colors flex cursor-pointer items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="accent-primary" />
                {label}
              </label>
            ))}
          </div>
          <Collapse show={method === "password"}>
            {method === "password" && (
              <div className="max-w-md">
                <Field label="كلمة المرور">
                  <PasswordField required who={who} />
                </Field>
              </div>
            )}
          </Collapse>
        </fieldset>

        <div className="flex flex-col gap-3 sm:col-span-2">
          <Collapse show={clashes.length > 0}>
            <div role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              <p className="font-medium">لا يمكن إضافة المستخدم: البيانات مكررة.</p>
              <ul className="mt-1 list-inside list-disc">
                {clashes.map((c) => (
                  <li key={c.field}>{c.message}</li>
                ))}
              </ul>
            </div>
          </Collapse>
          <FormMessage state={state} />
          <fieldset disabled={clashes.length > 0} className="flex flex-wrap gap-2">
            {method === "password" ? (
              <SubmitButton name="intent" value="create" pendingLabel="جارٍ الحفظ…">
                إنشاء المستخدم
              </SubmitButton>
            ) : (
              <>
                <SubmitButton name="intent" value="invite" pendingLabel="جارٍ الحفظ…">
                  إنشاء وإرسال الدعوة
                </SubmitButton>
                <SubmitButton name="intent" value="create" variant="secondary" pendingLabel="جارٍ الحفظ…">
                  إنشاء وإرسال الدعوة لاحقاً
                </SubmitButton>
              </>
            )}
          </fieldset>
        </div>
      </ActionForm>
  );
}

/** Sets a new password for an existing user. */
export function SetPasswordForm({ user }: { user: UserItem }) {
  const [state, action] = useActionState(setUserPassword.bind(null, user.id), null);
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-primary">تعيين كلمة مرور</summary>
      <ActionForm action={action} state={state} className="mt-2 flex max-w-md flex-col gap-2">
        <PasswordField required who={{ name: user.full_name, email: user.email }} />
        <FormMessage state={state} />
        <SubmitButton variant="secondary" pendingLabel="جارٍ الحفظ…" className="w-fit">
          حفظ كلمة المرور
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
