"use client";

import { useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass, type ButtonVariant } from "@/components/ui/styles";

/** Runs a server action after the user confirms, e.g. ending a membership. */
export function ConfirmButton({
  action,
  label,
  confirm,
  variant = "danger",
  icon,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  variant?: ButtonVariant;
  /** Shown instead of the label, which then names the button for screen readers. */
  icon?: ReactNode;
  /** Replaces the default sizing, e.g. a full-width button showing an icon with its label. */
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        if (window.confirm(confirm)) startTransition(() => action());
      }}
      aria-label={icon && !className ? label : undefined}
      title={icon && !className ? label : undefined}
      className={buttonClass(variant, className ?? (icon ? "p-1.5" : "px-3 py-1 text-xs"))}
    >
      {pending ? <Loader2 size={icon ? 16 : 14} aria-hidden="true" className="animate-spin" /> : icon ?? label}
    </button>
  );
}
