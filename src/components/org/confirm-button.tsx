"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui/form";

/** Runs a server action after the user confirms, e.g. ending a membership. */
export function ConfirmButton({
  action,
  label,
  confirm,
  variant = "danger",
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  variant?: "danger" | "secondary";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirm)) startTransition(() => action());
      }}
      className={buttonClass(variant, "px-3 py-1 text-xs")}
    >
      {label}
    </button>
  );
}
