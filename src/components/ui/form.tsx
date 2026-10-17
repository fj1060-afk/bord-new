"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useActionFormPending } from "./action-form";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Collapse } from "./collapse";
import { buttonClass, inputClass, type ButtonVariant } from "./styles";

export { buttonClass, compactInputClass, iconInputClass, inputClass, inputWith } from "./styles";

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
  const native = useFormStatus().pending;
  const pending = useActionFormPending() ?? native;
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className={buttonClass(variant, className)} {...props}>
      {pending && <Loader2 size={15} aria-hidden="true" className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** The server's answer to a form: shown only once it has arrived, and it folds in rather than jumping. */
export function FormMessage({ state }: { state: ActionState }) {
  return (
    <Collapse show={!!state?.message}>
      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={clsx("flex items-start gap-2 rounded-md px-3 py-2 text-sm", state.ok ? "bg-primary-soft text-primary" : "bg-danger/10 text-danger")}
        >
          {state.ok ? <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> : <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </Collapse>
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
