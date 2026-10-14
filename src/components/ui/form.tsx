"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";

export const inputClass =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" };

export function buttonClass(variant: ButtonProps["variant"] = "primary", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50",
    variant === "primary" && "bg-primary text-on-primary hover:opacity-90",
    variant === "secondary" && "border border-rule bg-surface text-ink hover:bg-primary-soft",
    variant === "danger" && "border border-danger/40 bg-surface text-danger hover:bg-danger/5",
    className,
  );
}

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
