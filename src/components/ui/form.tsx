"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { buttonClass, inputClass, type ButtonVariant } from "./styles";

export { buttonClass, inputClass } from "./styles";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

/** Submit button that disables itself while its form's action runs. */
export function SubmitButton({ children, pendingLabel, variant, className, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, className)} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={clsx("rounded-md px-3 py-2 text-sm", state.ok ? "bg-primary-soft text-primary" : "bg-danger/10 text-danger")}
    >
      {state.message}
    </p>
  );
}

export type ActionState = { ok: boolean; message: string } | null;

/** Optional English counterpart for bilingual printed documents; collapsed until it has a value. */
export function EnglishField({ name, defaultValue, rows }: { name: string; defaultValue?: string | null; rows?: number }) {
  return (
    <details open={!!defaultValue} className="text-sm">
      <summary className="cursor-pointer text-xs text-ink-muted">English · للمستندات ثنائية اللغة</summary>
      {rows ? (
        <textarea name={name} rows={rows} dir="ltr" lang="en" spellCheck defaultValue={defaultValue ?? ""} className={clsx(inputClass, "mt-1")} />
      ) : (
        <input name={name} dir="ltr" lang="en" defaultValue={defaultValue ?? ""} className={clsx(inputClass, "mt-1")} />
      )}
    </details>
  );
}
