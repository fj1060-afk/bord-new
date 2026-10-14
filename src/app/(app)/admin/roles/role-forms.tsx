"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { navigation } from "@/config/navigation";
import { LEVEL_LABELS, type Level } from "@/lib/permissions";
import { createRole, savePermissions } from "./actions";

const LEVEL_OPTIONS = [0, 1, 2, 3] as Level[];

export function PermissionsForm({
  roleId,
  current,
  locked,
}: {
  roleId: string;
  current: Record<string, number>;
  locked: boolean;
}) {
  const [state, action] = useActionState(savePermissions.bind(null, roleId), null);

  return (
    <form action={action} className="mt-5 flex flex-col gap-6">
      {navigation.map((group) => (
        <fieldset key={group.label} disabled={locked}>
          <legend className="mb-2 text-xs font-medium text-brass">{group.label}</legend>
          <ul className="divide-y divide-rule rounded-md border border-rule">
            {group.items.map((item) => (
              <li key={item.href} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <label htmlFor={`${roleId}-${item.href}`} className="text-sm">
                  {item.label}
                </label>
                <select
                  id={`${roleId}-${item.href}`}
                  name={item.href}
                  defaultValue={current[item.href] ?? 0}
                  className="rounded-md border border-rule bg-surface px-2 py-1.5 text-sm disabled:opacity-60"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      {locked ? (
        <p className="text-sm text-ink-muted">صلاحيات هذا الدور للعرض فقط.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <FormMessage state={state} />
          <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
            حفظ الصلاحيات
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

export function CreateRoleForm() {
  const [state, action] = useActionState(createRole, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4">
      <p className="text-sm font-medium">دور جديد</p>
      <Field label="الاسم">
        <input name="name" required className={inputClass} />
      </Field>
      <Field label="الوصف">
        <input name="description" className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingLabel="جارٍ الإنشاء…">
        إنشاء الدور
      </SubmitButton>
    </form>
  );
}
