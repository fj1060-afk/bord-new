import clsx from "clsx";

// Class helpers shared by server and client components. Keep this file free of
// "use client" so server pages can call these functions.

export const inputClass =
  "motion-colors w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 hover:border-ink-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_15%,transparent)] focus:outline-none";

export type ButtonVariant = "primary" | "secondary" | "danger";

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "motion-press inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-primary text-on-primary hover:opacity-90",
    variant === "secondary" && "border border-rule bg-surface text-ink hover:bg-primary-soft",
    variant === "danger" && "border border-danger/40 bg-surface text-danger hover:bg-danger/5",
    className,
  );
}
