"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { buttonClass, Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { createUser, sendInvitation, setUserStatus, updateUserRoles } from "./actions";
import type { RoleOption, UserItem } from "./page";

function RoleChecklist({ roles, selected }: { roles: RoleOption[]; selected?: string[] }) {
  return (
    <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
      <legend className="mb-2 text-sm font-medium">الأدوار</legend>
      {roles.map((role) => (
        <label key={role.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="role" value={role.id} defaultChecked={selected?.includes(role.id)} className="accent-primary" />
          {role.name}
        </label>
      ))}
    </fieldset>
  );
}

export function CreateUserForm({ roles }: { roles: RoleOption[] }) {
  const [state, action] = useActionState(createUser, null);

  return (
    <details className="group mb-6 rounded-lg border border-rule bg-surface">
      <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>
        <UserPlus size={16} aria-hidden="true" />
        إضافة مستخدم
      </summary>
      <ActionForm action={action} state={state} className="grid gap-4 border-t border-rule p-5 sm:grid-cols-2">
        <Field label="الاسم الكامل">
          <input name="full_name" required className={inputClass} />
        </Field>
        <Field label="البريد الإلكتروني" hint="تصل الدعوة لتعيين كلمة المرور على هذا البريد.">
          <input name="email" type="email" dir="ltr" required className={inputClass} />
        </Field>
        <Field label="الجوال">
          <input name="phone" type="tel" dir="ltr" className={inputClass} />
        </Field>
        <Field label="المسمى الوظيفي">
          <input name="job_title" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <RoleChecklist roles={roles} />
        </div>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <FormMessage state={state} />
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="intent" value="create" pendingLabel="جارٍ الحفظ…">
              إنشاء المستخدم
            </SubmitButton>
            <SubmitButton name="intent" value="invite" variant="secondary" pendingLabel="جارٍ الحفظ…">
              إنشاء وإرسال الدعوة
            </SubmitButton>
          </div>
        </div>
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
}: {
  user: UserItem;
  roles: RoleOption[];
  isSelf: boolean;
  canEdit: boolean;
  canManage: boolean;
}) {
  const [state, action] = useActionState(updateUserRoles.bind(null, user.id), null);
  const [pending, startTransition] = useTransition();
  const [inviteState, inviteAction] = useActionState(sendInvitation.bind(null, user.id), null);
  const roleNames = roles.filter((r) => user.roleIds.includes(r.id)).map((r) => r.name);
  const disabled = user.status === "disabled";

  return (
    <li>
      <details className="group">
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
    </li>
  );
}
