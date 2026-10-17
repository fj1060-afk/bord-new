import clsx from "clsx";

// Class helpers shared by server and client components. Keep this file free of
// "use client" so server pages can call these functions.

export const inputClass =
  "motion-colors w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 hover:border-ink-muted/50 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_15%,transparent)] focus:outline-none";

/**
 * inputClass with extra classes, dropping the base width or padding they
 * replace (two utilities for the same property would otherwise fight).
 */
export function inputWith(extra: string): string {
  const has = (re: RegExp) => extra.split(/\s+/).some((c) => re.test(c));
  let base = inputClass;
  if (has(/^(w-|max-w-|min-w-0$|flex-1$)/) && has(/^w-/)) base = base.replace("w-full", "");
  if (has(/^(p-|px-)/)) base = base.replace("px-3", "").replace("py-2", has(/^p-/) ? "" : "py-2");
  else if (has(/^ps-/) || has(/^pe-/)) base = base.replace("px-3", `${has(/^ps-/) ? "" : "ps-3"} ${has(/^pe-/) ? "" : "pe-3"}`);
  return `${base} ${extra}`.replace(/\s+/g, " ").trim();
}

/** A field sized to its content (selects in toolbars); inputClass alone stretches to the full width. */
export const compactInputClass = inputWith("w-auto");

/** A field with an icon at its start (e.g. search); leaves room for the icon. */
export const iconInputClass = inputWith("ps-9");

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
