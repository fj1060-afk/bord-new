"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { EllipsisVertical } from "lucide-react";

export const menuItem = "motion-colors flex w-full items-center gap-2 rounded px-3 py-2 text-start text-sm hover:bg-paper";

/** A «⋮» button opening a small menu of actions (a <details>, so it opens smoothly site-wide). */
export function RowMenu({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <details className={clsx("relative", className)}>
      <summary aria-label={label} title={label} className="motion-press grid size-8 cursor-pointer list-none place-items-center rounded-md border border-rule text-ink-muted hover:border-primary hover:text-primary [&::-webkit-details-marker]:hidden">
        <EllipsisVertical size={16} aria-hidden="true" />
      </summary>
      <div className="absolute end-0 top-full z-20 mt-1 w-52 rounded-lg border border-rule bg-surface p-1 shadow-lg">{children}</div>
    </details>
  );
}
