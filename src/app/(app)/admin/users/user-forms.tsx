"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { formatDateTime } from "@/lib/format";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { Collapse } from "@/components/ui/collapse";
import { PasswordField } from "@/components/ui/password-field";
import { createUser, deleteUser, sendInvitation, setUserPassword, setUserStatus, updateUserRoles } from "./actions";
import type { RoleOption, UserItem } from "./page";

function RoleChecklist({ roles, selected, onChange }: { roles: RoleOption[]; selected?: string[]; onChange?: (ids: string[]) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-2" onChange={(e) => onChange?.([...(e.currentTarget as HTMLFieldSetElement).querySelectorAll<HTMLInputElement>("input:checked")].map((i) => i.value))}>
      <legend className="mb-2 text-sm font-medium">الأدوار</legend>
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
export function CreateUserForm({ roles, departments, people, departmentId }: { roles: RoleOption[]; departments: Option[]; people: Option[]; departmentId?: string }) {
  const [state, action] = useActionState(createUser, null);
  const [method, setMethod] = useState<"password" | "invite">("password");
  const [who, setWho] = useState({ name: "", email: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const admin = roles.some((r) => picked.includes(r.id) && /مدير النظام/.test(r.name));

  return (

      <ActionForm action={action} state={state} className="grid gap-6 sm:grid-cols-2" onInput={(e) => {
        const f = e.currentTarget;
        setWho({ name: (f.elements.namedItem("full_name") as HTMLInputElement).value, email: (f.elements.namedItem("email") as HTMLInputElement).value });
      }}>
        <Section title="البيانات">
          <Field label="الاسم الكامل">
            <input name="full_name" required className={inputClass} />
          </Field>
          <Field label="البريد الإلكتروني" hint="يدخل به المستخدم إلى المنصة.">
            <input name="email" type="email" dir="ltr" required className={inputClass} />
          </Field>
          <Field label="الجوال">
            <input name="phone" type="tel" dir="ltr" inputMode="tel" pattern="[+0-9 ]{7,16}" title="أرقام فقط، ويمكن أن يبدأ بـ +" placeholder="+9665XXXXXXXX" className={inputClass} />
          </Field>
          <Field label="المسمى الوظيفي">
            <input name="job_title" className={inputClass} />
          </Field>
        </Section>

        <Section title={departmentId !== undefined ? "الربط" : "الجهة التابع لها"}>
          {departmentId !== undefined ? (
            <input type="hidden" name="department_id" value={departmentId} />
          ) : (
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
          )}
          <Field label="ربط بعضو مجلس أو لجنة" hint="لعضو مسجّل في الأشخاص وليس له حساب بعد.">
            <select name="person_id" defaultValue="" className={inputClass}>
              <option value="">بلا ربط</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

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
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </ActionForm>
  );
}

/** Sets a new password for an existing user. */
function SetPasswordForm({ user }: { user: UserItem }) {
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

export function UserRow({
  user,
  roles,
  isSelf,
  canEdit,
  canManage,
  canDelete,
  extra,
}: {
  user: UserItem;
  roles: RoleOption[];
  isSelf: boolean;
  canEdit: boolean;
  canManage: boolean;
  /** System administrator, while the data is trial. */
  canDelete?: boolean;
  /** An action beside the row, e.g. removing the user from a department. */
  extra?: React.ReactNode;
}) {
  const [state, action] = useActionState(updateUserRoles.bind(null, user.id), null);
  const [pending, startTransition] = useTransition();
  const [inviteState, inviteAction] = useActionState(sendInvitation.bind(null, user.id), null);
  const roleNames = roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name);
  const disabled = user.status === "disabled";

  return (
    <li className="flex items-start">
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-paper">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {user.full_name || "بدون اسم"}
              {isSelf && <span className="ms-2 text-xs text-ink-muted">(أنت)</span>}
            </span>
            <span className="block truncate text-xs text-ink-muted" dir="ltr">
              {user.email}
            </span>
          </span>
          <span className="text-sm text-ink-muted">{roleNames.join("، ") || "بدون دور"}</span>
          <span
            className={
              disabled
                ? "rounded-full border border-rule px-2.5 py-0.5 text-xs text-ink-muted"
                : "rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary"
            }
          >
            {disabled ? "معطّل" : "نشط"}
          </span>
        </summary>

        <div className="flex flex-col gap-4 border-t border-rule bg-paper px-5 py-4">
          {user.job_title && <p className="text-sm text-ink-muted">المسمى الوظيفي: {user.job_title}</p>}
          {canManage && !isSelf && !disabled && (
            <ActionForm action={inviteAction} state={inviteState} className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">
                {user.invited_at ? `آخر دعوة: ${formatDateTime(new Date(user.invited_at))}` : "لم تُرسل الدعوة بعد."}
              </p>
              <SubmitButton variant="secondary" pendingLabel="جارٍ الإرسال…" className="w-fit">
                {user.invited_at ? "إعادة إرسال الدعوة" : "إرسال الدعوة"}
              </SubmitButton>
              <FormMessage state={inviteState} />
            </ActionForm>
          )}
          {canManage && !isSelf && !disabled && <SetPasswordForm user={user} />}
          {canManage && !isSelf && (
            <ActionForm action={action} state={state} className="flex flex-col gap-3">
              <RoleChecklist roles={roles} selected={user.roleIds} />
              <FormMessage state={state} />
              <SubmitButton variant="secondary" pendingLabel="جارٍ الحفظ…" className="w-fit">
                حفظ الأدوار
              </SubmitButton>
            </ActionForm>
          )}
          {canEdit && !isSelf && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => setUserStatus(user.id, disabled ? "active" : "disabled"))}
              className={buttonClass(disabled ? "secondary" : "danger", "w-fit")}
            >
              {disabled ? "إعادة تفعيل المستخدم" : "تعطيل المستخدم"}
            </button>
          )}
          {isSelf && <p className="text-sm text-ink-muted">لا يمكنك تعديل أدوارك أو تعطيل حسابك بنفسك.</p>}
        </div>
      </details>
      {extra && <span className="shrink-0 py-3.5 pe-1">{extra}</span>}
      {canDelete && !isSelf && (
        <span className="shrink-0 py-3.5 pe-3">
          <ConfirmButton action={deleteUser.bind(null, user.id)} label={`حذف ${user.full_name || user.email}`} icon={<Trash2 size={16} aria-hidden="true" />} confirm={`حذف حساب «${user.full_name || user.email}» نهائياً؟ يبقى سجله في الأشخاص والتدقيق، ولا يمكن التراجع.`} />
        </span>
      )}
    </li>
  );
}
