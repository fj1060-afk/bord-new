"use client";

import { useTransition, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/form";

/** Runs a server action after the user confirms, e.g. ending a membership. */
export function ConfirmButton({
  action,
  label,
  confirm,
  variant = "danger",
  icon,
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  variant?: "danger" | "secondary";
  /** Shown instead of the label, which then names the button for screen readers. */
  icon?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirm)) startTransition(() => action());
      }}
      aria-label={icon ? label : undefined}
      title={icon ? label : undefined}
      className={buttonClass(variant, icon ? "p-1.5" : "px-3 py-1 text-xs")}
    >
      {icon ?? label}
    </button>
  );
}
